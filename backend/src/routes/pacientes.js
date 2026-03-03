/**
 * backend/src/routes/pacientes.js
 *
 * Rotas:
 * - GET    /api/pacientes?busca=...  -> lista/pesquisa (com ranking)
 * - GET    /api/pacientes/:id        -> detalhe + consultas
 * - POST   /api/pacientes            -> cadastra
 * - PUT    /api/pacientes/:id        -> atualiza
 * - DELETE /api/pacientes/:id        -> exclui com segurança (se não estiver na fila hoje)
 */

const express = require("express");
const { z } = require("zod");
const { prisma } = require("../db/prisma");

const router = express.Router();

/** -------------------- Helpers -------------------- */

function soDigitos(s) {
    return String(s || "").replace(/\D/g, "");
}

function normalizaEspacos(s) {
    return String(s || "")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeForSearch(s) {
    return normalizaEspacos(s)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); // remove acentos
}

function tokensDaBusca(busca) {
    const b = normalizaEspacos(busca);
    if (!b) return [];
    return b
        .split(" ")
        .map((t) => t.trim())
        .filter((t) => t.length >= 2);
}

// 1 token: exige palavra inteira (daniel != daniela)
function hasWord(text, word) {
    const t = normalizeForSearch(text || "");
    const w = normalizeForSearch(word || "");
    if (!w) return false;
    return t.split(" ").filter(Boolean).includes(w);
}

function containsAllTokens(text, tokens) {
    const t = normalizeForSearch(text || "");
    return tokens.every((x) => t.includes(normalizeForSearch(x)));
}

// regra “smart”:
// - 1 token: palavra inteira
// - 2+ tokens: substring (flexível)
function containsAllTokensSmart(text, tokens) {
    if (!tokens || tokens.length === 0) return false;
    if (tokens.length === 1) return hasWord(text, tokens[0]);
    return containsAllTokens(text, tokens);
}

function firstWord(text) {
    const n = normalizeForSearch(text || "");
    const parts = n.split(" ").filter(Boolean);
    return parts[0] || "";
}

function restOfName(text) {
    const n = normalizeForSearch(text || "");
    const parts = n.split(" ").filter(Boolean);
    return parts.slice(1).join(" ");
}

function localePtCompare(a, b) {
    return String(a || "").localeCompare(String(b || ""), "pt-BR", {
        sensitivity: "base",
    });
}

// AND: campo contém todas as palavras (no banco)
function andContainsTokens(field, tokens) {
    return {
        AND: tokens.map((t) => ({
            [field]: { contains: t, mode: "insensitive" },
        })),
    };
}

/**
 * scoreField:
 * quanto menor, melhor (mais relevante).
 * Observação: para 1 token, usamos "palavra inteira" e "primeira palavra exata" na lógica principal.
 */
function scoreField(text, tokens) {
    const t = normalizeForSearch(text || "");
    const words = t.split(" ").filter(Boolean);
    if (words.length === 0) return 9999;

    let score = 1000;

    for (const tokRaw of tokens) {
        const tok = normalizeForSearch(tokRaw);
        if (!tok) continue;

        if (words[0] === tok) score = Math.min(score, 0);
        else if (words[0].startsWith(tok)) score = Math.min(score, 1);
        else if (words.includes(tok)) score = Math.min(score, 2);
        else if (words.some((w) => w.startsWith(tok))) score = Math.min(score, 3);
        else if (t.includes(tok)) score = Math.min(score, 4);
    }

    return score;
}

/**
 * Decide:
 * - score (ranking)
 * - _match: por qual campo ele entrou (NOME/MÃE/CPF/TELEFONE/...)
 */
function scorePaciente(p, tokens, buscaDigits) {
    const t = tokens || [];

    // 0) Números ganham sempre quando batem
    if (buscaDigits && buscaDigits.length >= 3) {
        const cpfD = soDigitos(p.p_cpf_digits || p.p_cpf || "");
        const foneD = soDigitos(p.p_fone || "");
        const idStr = String(p.id_paciente || "");

        if (idStr === buscaDigits) {
            return { score: 0, match: { field: "FICHA", value: idStr } };
        }
        if (cpfD.includes(buscaDigits)) {
            return { score: 1, match: { field: "CPF", value: p.p_cpf || p.p_cpf_digits || "" } };
        }
        if (foneD.includes(buscaDigits)) {
            return { score: 2, match: { field: "TELEFONE", value: p.p_fone || "" } };
        }
    }

    // 1) Busca de 1 palavra: prioriza NOME (evita “daniel” virar “daniela” na mãe)
    if (t.length === 1) {
        const tok = t[0];
        const tokN = normalizeForSearch(tok);

        const nomeFirstExact = firstWord(p.p_nome) === tokN;
        const nomeHasWord = hasWord(p.p_nome, tok);
        const maeHasWord = hasWord(p.p_mae, tok);

        if (nomeFirstExact) return { score: 0, match: { field: "NOME", value: p.p_nome || "" } };
        if (nomeHasWord) return { score: 1, match: { field: "NOME", value: p.p_nome || "" } };
        if (maeHasWord) return { score: 20, match: { field: "MÃE", value: p.p_mae || "" } };
        // cai no fallback
    }

    // 2) 2+ palavras: se bate tudo na MÃE e não bate tudo no NOME -> mostra MÃE
    const nomeOk = containsAllTokensSmart(p.p_nome, t);
    const maeOk = containsAllTokensSmart(p.p_mae, t);
    const cidadeOk = containsAllTokensSmart(p.p_cidade, t);
    const endOk = containsAllTokensSmart(p.p_endereco, t);

    if (t.length >= 2) {
        if (maeOk && !nomeOk) return { score: 0, match: { field: "MÃE", value: p.p_mae || "" } };
        if (nomeOk) return { score: 1, match: { field: "NOME", value: p.p_nome || "" } };
        if (endOk) return { score: 2, match: { field: "ENDEREÇO", value: p.p_endereco || "" } };
        if (cidadeOk) return { score: 3, match: { field: "CIDADE", value: p.p_cidade || "" } };
    }

    // 3) fallback por score
    const candidates = [
        { field: "NOME", score: scoreField(p.p_nome, t), value: p.p_nome || "" },
        { field: "MÃE", score: scoreField(p.p_mae, t) + 10, value: p.p_mae || "" },
        { field: "CIDADE", score: scoreField(p.p_cidade, t) + 25, value: p.p_cidade || "" },
        { field: "ENDEREÇO", score: scoreField(p.p_endereco, t) + 25, value: p.p_endereco || "" },
    ];

    if (p.p_rg) candidates.push({ field: "RG", score: scoreField(p.p_rg, t) + 40, value: p.p_rg });

    candidates.sort((a, b) => a.score - b.score);
    const best = candidates[0] || { field: "NOME", score: 9999, value: "" };

    return { score: best.score, match: { field: best.field, value: best.value } };
}

/** -------------------- GET /api/pacientes -------------------- */
router.get("/", async (req, res) => {
    try {
        const buscaRaw = String(req.query.busca || "");
        const busca = normalizaEspacos(buscaRaw);
        const tokens = tokensDaBusca(busca);
        const buscaDigits = soDigitos(busca);

        // Sem busca: últimos cadastrados primeiro
        if (!busca) {
            const pacientes = await prisma.paciente.findMany({
                orderBy: [{ p_data: "desc" }, { id_paciente: "desc" }],
                take: 100,
            });
            return res.json(pacientes);
        }

        // Se for muito curto e sem dígitos, não busca
        if (tokens.length === 0 && buscaDigits.length === 0) {
            return res.json([]);
        }

        // ---------------------------
        // PARTE MAIS IMPORTANTE:
        // 2+ palavras => filtra NO BANCO por AND tokens (evita “sumir registro” por causa de take)
        // 1 palavra  => busca mais ampla com ranking (não dá pra garantir todos em nomes comuns)
        // ---------------------------

        let candidatos = [];

        if (tokens.length >= 2) {
            // ✅ Consulta restritiva no banco: AND tokens por campo
            const OR = [
                andContainsTokens("p_nome", tokens),
                andContainsTokens("p_mae", tokens),
                andContainsTokens("p_endereco", tokens),
                andContainsTokens("p_cidade", tokens),
            ];

            // Complementos (rg/cpf/fone) com contains do texto completo (não tokeniza bem)
            OR.push({ p_rg: { contains: busca, mode: "insensitive" } });
            OR.push({ p_cpf: { contains: busca, mode: "insensitive" } });
            OR.push({ p_fone: { contains: busca, mode: "insensitive" } });

            // Se veio número junto, ajuda
            if (buscaDigits.length >= 3) {
                OR.push({ p_cpf_digits: { contains: buscaDigits } });
                OR.push({ p_cpf: { contains: buscaDigits } });
                OR.push({ p_fone: { contains: buscaDigits } });

                const possivelId = Number(buscaDigits);
                if (Number.isInteger(possivelId) && possivelId > 0) {
                    OR.push({ id_paciente: possivelId });
                }
            }

            candidatos = await prisma.paciente.findMany({
                where: { OR },
                // orderBy dá estabilidade (não “some” por ordem aleatória)
                orderBy: [{ id_paciente: "desc" }],
                take: 4000,
            });
        } else {
            // 1 token: busca ampla porém estável (com orderBy)
            const token = tokens[0] || busca;

            const OR = [
                { p_nome: { contains: token, mode: "insensitive" } },
                { p_mae: { contains: token, mode: "insensitive" } },
                { p_endereco: { contains: token, mode: "insensitive" } },
                { p_cidade: { contains: token, mode: "insensitive" } },
                { p_rg: { contains: token, mode: "insensitive" } },
                { p_cpf: { contains: token, mode: "insensitive" } },
                { p_fone: { contains: token, mode: "insensitive" } },
            ];

            if (buscaDigits.length >= 3) {
                OR.push({ p_cpf_digits: { contains: buscaDigits } });
                OR.push({ p_cpf: { contains: buscaDigits } });
                OR.push({ p_fone: { contains: buscaDigits } });

                const possivelId = Number(buscaDigits);
                if (Number.isInteger(possivelId) && possivelId > 0) {
                    OR.push({ id_paciente: possivelId });
                }
            }

            candidatos = await prisma.paciente.findMany({
                where: { OR },
                orderBy: [{ id_paciente: "desc" }],
                take: 6000,
            });
        }

        // 1) rankear + anexar _match
        const rankeados = candidatos
            .map((p) => {
                const { score, match } = scorePaciente(p, tokens, buscaDigits);
                return { ...p, _score: score, _match: match };
            })
            // 2) filtro “smart” (não deixar passar coisa muito fora)
            .filter((p) => {
                if (tokens.length === 0) return true;

                const okNome = containsAllTokensSmart(p.p_nome, tokens);
                const okMae = containsAllTokensSmart(p.p_mae, tokens);
                const okCidade = containsAllTokensSmart(p.p_cidade, tokens);
                const okEnd = containsAllTokensSmart(p.p_endereco, tokens);

                // Se for busca numérica, aceita (scorePaciente já faz match)
                if (buscaDigits.length >= 3 && (p._match?.field === "CPF" || p._match?.field === "TELEFONE" || p._match?.field === "FICHA")) {
                    return true;
                }

                return okNome || okMae || okCidade || okEnd;
            });

        // 3) Ordenação final
        const tokenN = normalizeForSearch(tokens[0] || "");
        const isSingleToken = tokens.length === 1 && tokenN.length > 0;

        rankeados.sort((a, b) => {
            if (a._score !== b._score) return a._score - b._score;

            // Se for 1 palavra e ambos começam com a palavra exata, ordena pelo resto do nome
            if (isSingleToken) {
                const aFirst = firstWord(a.p_nome);
                const bFirst = firstWord(b.p_nome);

                const aIsExact = aFirst === tokenN;
                const bIsExact = bFirst === tokenN;

                if (aIsExact && bIsExact) {
                    const ra = restOfName(a.p_nome);
                    const rb = restOfName(b.p_nome);
                    const cmpRest = localePtCompare(ra, rb);
                    if (cmpRest !== 0) return cmpRest;

                    const cmpFull = localePtCompare(a.p_nome, b.p_nome);
                    if (cmpFull !== 0) return cmpFull;
                }
            }

            // fallback alfabético por nome
            const cmp = localePtCompare(a.p_nome, b.p_nome);
            if (cmp !== 0) return cmp;

            return (b.id_paciente || 0) - (a.id_paciente || 0);
        });

        // 4) top 100, remove _score
        const saida = rankeados.slice(0, 100).map((p) => {
            const { _score, ...rest } = p;
            return rest;
        });

        return res.json(saida);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro ao buscar pacientes." });
    }
});

/** -------------------- GET /api/pacientes/:id -------------------- */
router.get("/:id_paciente", async (req, res) => {
    try {
        const id_paciente = Number(req.params.id_paciente);
        if (!Number.isInteger(id_paciente)) return res.status(400).json({ error: "ID inválido." });

        const paciente = await prisma.paciente.findUnique({ where: { id_paciente } });
        if (!paciente) return res.status(404).json({ error: "Paciente não encontrado." });

        const consultas = await prisma.consulta.findMany({
            where: { id_paciente },
            orderBy: { c_dataConsulta: "desc" },
            take: 50,
        });

        return res.json({ paciente, consultas });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro ao buscar detalhes do paciente." });
    }
});

/** -------------------- POST /api/pacientes -------------------- */
router.post("/", async (req, res) => {
    try {
        const schema = z.object({
            p_nome: z.string().min(2),
            p_mae: z.string().optional().nullable(),
            p_cpf: z.string().optional().nullable(),
            p_rg: z.string().optional().nullable(),
            p_endereco: z.string().optional().nullable(),
            p_cidade: z.string().optional().nullable(),
            p_fone: z.string().optional().nullable(),
            p_nascimento: z.string().optional().nullable(), // YYYY-MM-DD
        });

        const data = schema.parse(req.body);
        const cpfDigits = soDigitos(data.p_cpf);

        const paciente = await prisma.paciente.create({
            data: {
                p_nome: data.p_nome,
                p_mae: data.p_mae || null,
                p_cpf: data.p_cpf || null,
                p_cpf_digits: cpfDigits || null,
                p_rg: data.p_rg || null,
                p_endereco: data.p_endereco || null,
                p_cidade: data.p_cidade || null,
                p_fone: data.p_fone || null,
                p_nascimento: data.p_nascimento ? new Date(data.p_nascimento) : null,
                p_data: new Date(),
            },
        });

        res.status(201).json(paciente);
    } catch (e) {
        console.error(e);
        res.status(400).json({ error: "Dados inválidos para cadastro." });
    }
});

/** -------------------- PUT /api/pacientes/:id -------------------- */
router.put("/:id_paciente", async (req, res) => {
    try {
        const id_paciente = Number(req.params.id_paciente);
        if (!Number.isInteger(id_paciente)) return res.status(400).json({ error: "ID inválido." });

        const schema = z.object({
            p_nome: z.string().min(2).optional(),
            p_mae: z.string().optional().nullable(),
            p_cpf: z.string().optional().nullable(),
            p_rg: z.string().optional().nullable(),
            p_endereco: z.string().optional().nullable(),
            p_cidade: z.string().optional().nullable(),
            p_fone: z.string().optional().nullable(),
            p_nascimento: z.string().optional().nullable(),
        });

        const data = schema.parse(req.body);
        const updateData = { ...data };

        if (Object.prototype.hasOwnProperty.call(data, "p_cpf")) {
            updateData.p_cpf_digits = soDigitos(data.p_cpf) || null;
        }
        if (Object.prototype.hasOwnProperty.call(data, "p_nascimento")) {
            updateData.p_nascimento = data.p_nascimento ? new Date(data.p_nascimento) : null;
        }

        const paciente = await prisma.paciente.update({
            where: { id_paciente },
            data: updateData,
        });

        res.json(paciente);
    } catch (e) {
        console.error(e);
        res.status(400).json({ error: "Não foi possível atualizar o paciente." });
    }
});

/** -------------------- DELETE /api/pacientes/:id -------------------- */
router.delete("/:id_paciente", async (req, res) => {
    try {
        const id_paciente = Number(req.params.id_paciente);
        if (!Number.isInteger(id_paciente)) return res.status(400).json({ error: "ID inválido." });

        const paciente = await prisma.paciente.findUnique({ where: { id_paciente } });
        if (!paciente) return res.status(404).json({ error: "Paciente não encontrado." });

        const now = new Date();
        const dia = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const ativoHoje = await prisma.filaAtendimento.findFirst({
            where: {
                id_paciente,
                dia,
                status: { in: ["NA_FILA", "CHAMADO"] },
            },
        });

        if (ativoHoje) {
            return res.status(409).json({
                error: "Este paciente está NA FILA/CHAMADO hoje. Cancele/finalize na fila antes de excluir.",
            });
        }

        await prisma.$transaction([
            prisma.filaAtendimento.deleteMany({ where: { id_paciente } }),
            prisma.consulta.deleteMany({ where: { id_paciente } }),
            prisma.paciente.delete({ where: { id_paciente } }),
        ]);

        res.json({ ok: true, id_paciente });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro ao excluir paciente." });
    }
});

module.exports = { pacientesRouter: router };