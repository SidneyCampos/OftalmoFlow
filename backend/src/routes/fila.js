/**
 * Rotas da fila: entrar, listar do dia, chamar/finalizar/cancelar.
 */
const express = require("express");
const { z } = require("zod");
const { prisma } = require("../db/prisma");

const router = express.Router();

function todayDateOnly() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

router.get("/", async (req, res) => {
    try {
        const diaStr = (req.query.dia || "").trim();
        const dia = diaStr ? new Date(diaStr) : todayDateOnly();

        const fila = await prisma.filaAtendimento.findMany({
            where: { dia },
            orderBy: [{ status: "asc" }, { chegada_em: "asc" }],
            include: { paciente: true },
        });

        res.json(fila);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro ao buscar fila." });
    }
});

router.post("/", async (req, res) => {
    try {
        const schema = z.object({ id_paciente: z.number().int().positive() });
        const { id_paciente } = schema.parse(req.body);
        const dia = todayDateOnly();

        const jaAtivo = await prisma.filaAtendimento.findFirst({
            where: { dia, id_paciente, status: { in: ["NA_FILA", "CHAMADO"] } },
        });

        if (jaAtivo) return res.status(409).json({ error: "Já está na fila hoje." });

        const novo = await prisma.filaAtendimento.create({
            data: { id_paciente, dia },
            include: { paciente: true },
        });

        res.status(201).json(novo);
    } catch (e) {
        console.error(e);
        res.status(400).json({ error: "Dados inválidos para entrar na fila." });
    }
});

router.patch("/:id_fila", async (req, res) => {
    try {
        const id_fila = Number(req.params.id_fila);
        const schema = z.object({ acao: z.enum(["chamar", "finalizar", "cancelar"]) });
        const { acao } = schema.parse(req.body);

        const fila = await prisma.filaAtendimento.findUnique({ where: { id_fila } });
        if (!fila) return res.status(404).json({ error: "Não encontrado." });

        let data = {};
        if (acao === "chamar") data = { status: "CHAMADO", chamado_em: new Date() };
        if (acao === "finalizar") data = { status: "FINALIZADO", finalizado_em: new Date() };
        if (acao === "cancelar") data = { status: "CANCELADO", finalizado_em: new Date() };

        const atualizado = await prisma.filaAtendimento.update({
            where: { id_fila },
            data,
            include: { paciente: true },
        });

        res.json(atualizado);
    } catch (e) {
        console.error(e);
        res.status(400).json({ error: "Erro ao atualizar fila." });
    }
});

module.exports = { filaRouter: router };
