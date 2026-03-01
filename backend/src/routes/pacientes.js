/**
 * backend/src/routes/pacientes.js
 * Rotas de Pacientes:
 * - GET  /api/pacientes?busca=...   -> lista/pesquisa
 * - GET  /api/pacientes/:id        -> detalhe do paciente + histórico
 * - POST /api/pacientes            -> cadastra paciente
 * - PUT  /api/pacientes/:id        -> atualiza paciente
 */

const express = require("express");
const { z } = require("zod");
const { prisma } = require("../db/prisma");

const router = express.Router();

// Remove tudo que não é número (útil pra CPF/telefone)
function soDigitos(s) {
    return String(s || "").replace(/\D/g, "");
}

// ---------- GET LISTA / PESQUISA ----------
router.get("/", async (req, res) => {
    try {
        const busca = String(req.query.busca || "").trim();
        const buscaLower = busca.toLowerCase();
        const buscaDigits = soDigitos(busca);

        if (!busca) {
            const pacientes = await prisma.paciente.findMany({
                orderBy: { id_paciente: "desc" },
                take: 100,
            });
            return res.json(pacientes);
        }

        const OR = [];

        OR.push({ p_nome: { contains: buscaLower, mode: "insensitive" } });
        OR.push({ p_mae: { contains: buscaLower, mode: "insensitive" } });
        OR.push({ p_cidade: { contains: buscaLower, mode: "insensitive" } });
        OR.push({ p_endereco: { contains: buscaLower, mode: "insensitive" } });
        OR.push({ p_rg: { contains: buscaLower, mode: "insensitive" } });
        OR.push({ p_cpf: { contains: buscaLower, mode: "insensitive" } });
        OR.push({ p_fone: { contains: buscaLower, mode: "insensitive" } });

        if (buscaDigits.length >= 3) {
            OR.push({ p_cpf_digits: { contains: buscaDigits } });
            OR.push({ p_cpf: { contains: buscaDigits } });
            OR.push({ p_fone: { contains: buscaDigits } });

            const possivelId = Number(buscaDigits);
            if (Number.isInteger(possivelId) && possivelId > 0) {
                OR.push({ id_paciente: possivelId });
            }
        }

        const pacientes = await prisma.paciente.findMany({
            where: { OR },
            orderBy: { p_nome: "asc" },
            take: 100,
        });

        res.json(pacientes);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro ao buscar pacientes." });
    }
});

// ---------- GET DETALHE + HISTÓRICO ----------
router.get("/:id_paciente", async (req, res) => {
    try {
        const id_paciente = Number(req.params.id_paciente);
        if (!Number.isInteger(id_paciente)) {
            return res.status(400).json({ error: "ID inválido." });
        }

        const paciente = await prisma.paciente.findUnique({
            where: { id_paciente },
        });

        if (!paciente) {
            return res.status(404).json({ error: "Paciente não encontrado." });
        }

        const consultas = await prisma.consulta.findMany({
            where: { id_paciente },
            orderBy: { c_dataConsulta: "desc" },
            take: 50,
        });

        res.json({ paciente, consultas });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro ao buscar detalhes do paciente." });
    }
});

// ---------- POST CADASTRO ----------
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
            p_nascimento: z.string().optional().nullable(), // "YYYY-MM-DD"
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
            },
        });

        res.status(201).json(paciente);
    } catch (e) {
        console.error(e);
        res.status(400).json({ error: "Dados inválidos para cadastro." });
    }
});

// ---------- PUT UPDATE ----------
router.put("/:id_paciente", async (req, res) => {
    try {
        const id_paciente = Number(req.params.id_paciente);
        if (!Number.isInteger(id_paciente)) {
            return res.status(400).json({ error: "ID inválido." });
        }

        // Para UPDATE, tudo é opcional (a recepção pode mudar só 1 campo)
        const schema = z.object({
            p_nome: z.string().min(2).optional(),
            p_mae: z.string().optional().nullable(),
            p_cpf: z.string().optional().nullable(),
            p_rg: z.string().optional().nullable(),
            p_endereco: z.string().optional().nullable(),
            p_cidade: z.string().optional().nullable(),
            p_fone: z.string().optional().nullable(),
            p_nascimento: z.string().optional().nullable(), // "YYYY-MM-DD" ou null
        });

        const data = schema.parse(req.body);

        // Normaliza CPF digits se vier CPF
        const updateData = { ...data };
        if (Object.prototype.hasOwnProperty.call(data, "p_cpf")) {
            const cpfDigits = soDigitos(data.p_cpf);
            updateData.p_cpf_digits = cpfDigits || null;
        }

        // Converte nascimento se vier
        if (Object.prototype.hasOwnProperty.call(data, "p_nascimento")) {
            updateData.p_nascimento = data.p_nascimento
                ? new Date(data.p_nascimento)
                : null;
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

module.exports = { pacientesRouter: router };
