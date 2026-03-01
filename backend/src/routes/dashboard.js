/**
 * backend/src/routes/dashboard.js
 * Rotas de dashboard (admin):
 * - Retorna métricas agregadas: pacientes, atendimentos, fila do dia, etc.
 * - Futuro: vamos proteger com login/roles (administrativo).
 */

const express = require("express");
const { prisma } = require("../db/prisma");

const dashboardRouter = express.Router();


/** Helpers de datas (sem libs) */
function startOfDay(d = new Date()) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}
function startOfWeek(d = new Date()) {
    // semana começando na segunda (padrão BR)
    const x = startOfDay(d);
    const day = (x.getDay() + 6) % 7; // domingo=6, segunda=0...
    x.setDate(x.getDate() - day);
    return x;
}
function startOfMonth(d = new Date()) {
    const x = startOfDay(d);
    x.setDate(1);
    return x;
}
function startOfYear(d = new Date()) {
    const x = startOfDay(d);
    x.setMonth(0, 1);
    return x;
}
function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
}

dashboardRouter.get("/summary", async (req, res) => {
    try {
        const now = new Date();
        const hoje = startOfDay(now);
        const amanha = addDays(hoje, 1);

        const iniSemana = startOfWeek(now);
        const iniMes = startOfMonth(now);
        const iniAno = startOfYear(now);

        // 1) Totais e contagens por período (em paralelo = mais rápido)
        const [
            totalPacientes,
            totalAtendimentos,
            atendHoje,
            atendSemana,
            atendMes,
            atendAno,
            cadSemana,
            cadMes,
            cadAno,
        ] = await Promise.all([
            prisma.paciente.count(),
            prisma.consulta.count(),
            prisma.consulta.count({ where: { c_dataConsulta: { gte: hoje, lt: amanha } } }),
            prisma.consulta.count({ where: { c_dataConsulta: { gte: iniSemana, lt: amanha } } }),
            prisma.consulta.count({ where: { c_dataConsulta: { gte: iniMes, lt: amanha } } }),
            prisma.consulta.count({ where: { c_dataConsulta: { gte: iniAno, lt: amanha } } }),
            prisma.paciente.count({ where: { p_data: { gte: iniSemana, lt: amanha } } }),
            prisma.paciente.count({ where: { p_data: { gte: iniMes, lt: amanha } } }),
            prisma.paciente.count({ where: { p_data: { gte: iniAno, lt: amanha } } }),
        ]);

        // 4) Fila de hoje por status
        const filaHojeGroup = await prisma.filaAtendimento.groupBy({
            by: ["status"],
            where: { dia: { gte: hoje, lt: amanha } },
            _count: { _all: true },
        });

        const filaHojePorStatus = { NA_FILA: 0, CHAMADO: 0, FINALIZADO: 0, CANCELADO: 0 };
        for (const item of filaHojeGroup) {
            filaHojePorStatus[item.status] = item._count._all;
        }
        const filaHojeTotal = Object.values(filaHojePorStatus).reduce((acc, n) => acc + (Number(n) || 0), 0);

        // 5) Top cidades (cadastros)
        // OBS: no Prisma 6, no groupBy não existe "select".
        // E pra ordenar por "quantidade de registros", usamos count do id_paciente (sempre não nulo).
        const topCidadesRaw = await prisma.paciente.groupBy({
            by: ["p_cidade"],
            where: {
                p_cidade: { not: null },
            },
            _count: {
                id_paciente: true, // conta quantos pacientes existem em cada cidade
            },
            orderBy: {
                _count: {
                    id_paciente: "desc",
                },
            },
            take: 5,
        });

        const topCidades = topCidadesRaw
            .filter((x) => String(x.p_cidade || "").trim() !== "")
            .map((x) => ({
                cidade: x.p_cidade,
                qtd: x._count.id_paciente,
            }));



        // 6) Últimos 7 dias (fallback seguro: 7 queries, evita problema com nome de tabela)
        const dias = Array.from({ length: 7 }, (_, idx) => 6 - idx);
        const ultimos7dias = await Promise.all(
            dias.map(async (i) => {
                const d0 = startOfDay(addDays(now, -i));
                const d1 = addDays(d0, 1);
                const qtd = await prisma.consulta.count({ where: { c_dataConsulta: { gte: d0, lt: d1 } } });
                return { data: d0.toISOString().slice(0, 10), qtd };
            }),
        );

        return res.json({
            ok: true,
            generatedAt: now.toISOString(),
            pacientes: {
                total: totalPacientes,
                cadastradosSemana: cadSemana,
                cadastradosMes: cadMes,
                cadastradosAno: cadAno,
            },
            atendimentos: {
                total: totalAtendimentos,
                hoje: atendHoje,
                semana: atendSemana,
                mes: atendMes,
                ano: atendAno,
                ultimos7dias,
            },
            fila: { hoje: filaHojeTotal, hojePorStatus: filaHojePorStatus },
            insights: { topCidades },
        });
    } catch (err) {
        console.error("Erro dashboard/summary:", err);
        return res.status(500).json({ ok: false, error: "Erro ao gerar dashboard." });
    }
});

module.exports = { dashboardRouter };
