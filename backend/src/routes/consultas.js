/**
 * Rotas de Consultas (Prontuário):
 * - POST /api/consultas                -> cria consulta/prontuário
 * - GET  /api/consultas/:id_paciente   -> lista histórico (JSON)
 * - GET  /api/consultas/pdf/:id        -> PDF de uma consulta
 * - GET  /api/consultas/historico/pdf/:id_paciente -> PDF do histórico do paciente
 */

const express = require("express");
const { z } = require("zod");
const PDFDocument = require("pdfkit");
const { prisma } = require("../db/prisma");

const router = express.Router();

function toDateBR(v) {
  try {
    if (!v) return "-";
    return new Date(v).toLocaleDateString("pt-BR");
  } catch {
    return "-";
  }
}

function calcAge(date) {
  try {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age;
  } catch {
    return null;
  }
}

function writeKeyValue(doc, label, value) {
  doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
  doc.font("Helvetica").text(value || "-");
}

function sectionTitle(doc, title) {
  doc.moveDown(0.6);
  doc.fontSize(12).font("Helvetica-Bold").text(title);
  doc.moveDown(0.2);
  doc.fontSize(10).font("Helvetica");
}

function sendPdf(res, filename, builder) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=\"${filename.replace(/\s+/g, "_")}\"`,
  );

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 40, bottom: 40, left: 45, right: 45 },
  });

  doc.pipe(res);
  builder(doc);
  doc.end();
}

// ===== PDFs (colocar ANTES do "/:id_paciente" para não conflitar) =====

router.get("/pdf/:id_consulta", async (req, res) => {
  try {
    const id_consulta = Number(req.params.id_consulta);
    if (!Number.isInteger(id_consulta) || id_consulta <= 0) {
      return res.status(400).json({ error: "ID de consulta inválido." });
    }

    const consulta = await prisma.consulta.findUnique({
      where: { id_consulta },
      include: { paciente: true },
    });

    if (!consulta) {
      return res.status(404).json({ error: "Consulta não encontrada." });
    }

    const p = consulta.paciente;
    const idade = calcAge(p?.p_nascimento);

    const filename = `consulta-${consulta.id_consulta}.pdf`;

    return sendPdf(res, filename, (doc) => {
      doc.fontSize(16).font("Helvetica-Bold").text("Consulta / Prontuário", {
        align: "center",
      });
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(`Gerado em: ${toDateBR(new Date())}`, { align: "center" });

      doc.moveDown(1);
      sectionTitle(doc, "Identificação do paciente");
      writeKeyValue(doc, "Ficha", String(p?.id_paciente ?? "-"));
      writeKeyValue(doc, "Nome", p?.p_nome);
      writeKeyValue(doc, "CPF", p?.p_cpf);
      writeKeyValue(doc, "Telefone", p?.p_fone);
      writeKeyValue(
        doc,
        "Nascimento",
        p?.p_nascimento
          ? `${toDateBR(p.p_nascimento)}${idade !== null ? ` (${idade} anos)` : ""}`
          : "-",
      );

      sectionTitle(doc, "Consulta");
      writeKeyValue(doc, "Data", toDateBR(consulta.c_dataConsulta || consulta.created_at));
      writeKeyValue(doc, "Especialidade", consulta.c_especialidade);
      doc.moveDown(0.2);

      doc.font("Helvetica-Bold").text("Queixa principal:");
      doc.font("Helvetica").text(consulta.c_queixaPessoal || "-");
      doc.moveDown(0.3);

      doc.font("Helvetica-Bold").text("Diagnóstico:");
      doc.font("Helvetica").text(consulta.c_diagnostico || "-");
      doc.moveDown(0.3);

      doc.font("Helvetica-Bold").text("Conduta / Plano:");
      doc.font("Helvetica").text(consulta.c_condutaConsulta || "-");
      doc.moveDown(0.3);

      doc.font("Helvetica-Bold").text("Medicações em uso:");
      doc.font("Helvetica").text(consulta.c_medicacoesEmUso || "-");
      doc.moveDown(0.3);

      doc.font("Helvetica-Bold").text("Alergias:");
      doc.font("Helvetica").text(consulta.c_alergias || "-");

      if (String(consulta.c_receita || "").trim()) {
        sectionTitle(doc, "Receita");
        doc.font("Helvetica").text(consulta.c_receita);
      }

      if (String(consulta.c_exameFisico || "").trim()) {
        sectionTitle(doc, "Exame físico / Achados");
        doc.font("Helvetica").text(consulta.c_exameFisico);
      }

      if (String(consulta.c_historicoPessoal || "").trim() || String(consulta.c_historicoFamiliar || "").trim()) {
        sectionTitle(doc, "Anamnese / Antecedentes");
        if (String(consulta.c_historicoPessoal || "").trim()) {
          doc.font("Helvetica-Bold").text("Histórico pessoal:");
          doc.font("Helvetica").text(consulta.c_historicoPessoal);
          doc.moveDown(0.2);
        }
        if (String(consulta.c_historicoFamiliar || "").trim()) {
          doc.font("Helvetica-Bold").text("Histórico familiar:");
          doc.font("Helvetica").text(consulta.c_historicoFamiliar);
        }
      }

      const oftalmoHas = [
        consulta.c_acuidadeOd,
        consulta.c_acuidadeOe,
        consulta.c_pressaoOcularOd,
        consulta.c_pressaoOcularOe,
        consulta.c_bioOd,
        consulta.c_bioOe,
        consulta.c_fundoOlhoOd,
        consulta.c_fundoOlhoOe,
      ].some((x) => String(x || "").trim());

      if (oftalmoHas) {
        sectionTitle(doc, "Exame oftalmológico (opcional)");
        writeKeyValue(doc, "Acuidade OD", consulta.c_acuidadeOd);
        writeKeyValue(doc, "Acuidade OE", consulta.c_acuidadeOe);
        writeKeyValue(doc, "Pressão OD", consulta.c_pressaoOcularOd);
        writeKeyValue(doc, "Pressão OE", consulta.c_pressaoOcularOe);
        writeKeyValue(doc, "BIO OD", consulta.c_bioOd);
        writeKeyValue(doc, "BIO OE", consulta.c_bioOe);
        writeKeyValue(doc, "Fundo OD", consulta.c_fundoOlhoOd);
        writeKeyValue(doc, "Fundo OE", consulta.c_fundoOlhoOe);
      }

      if (String(consulta.c_geral || "").trim()) {
        sectionTitle(doc, "Observações");
        doc.font("Helvetica").text(consulta.c_geral);
      }

      doc.moveDown(1);
      doc
        .fontSize(9)
        .fillColor("gray")
        .text("Documento gerado pelo sistema OftalmoFlow", { align: "center" });
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao gerar PDF da consulta." });
  }
});

router.get("/historico/pdf/:id_paciente", async (req, res) => {
  try {
    const id_paciente = Number(req.params.id_paciente);
    if (!Number.isInteger(id_paciente) || id_paciente <= 0) {
      return res.status(400).json({ error: "ID de paciente inválido." });
    }

    const paciente = await prisma.paciente.findUnique({
      where: { id_paciente },
    });
    if (!paciente) {
      return res.status(404).json({ error: "Paciente não encontrado." });
    }

    const consultas = await prisma.consulta.findMany({
      where: { id_paciente },
      orderBy: { created_at: "desc" },
      take: 200,
    });

    const idade = calcAge(paciente?.p_nascimento);

    const filename = `historico-${paciente.id_paciente}.pdf`;

    return sendPdf(res, filename, (doc) => {
      doc.fontSize(16).font("Helvetica-Bold").text("Histórico do paciente", {
        align: "center",
      });
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(`Gerado em: ${toDateBR(new Date())}`, { align: "center" });

      doc.moveDown(1);
      sectionTitle(doc, "Paciente");
      writeKeyValue(doc, "Ficha", String(paciente?.id_paciente ?? "-"));
      writeKeyValue(doc, "Nome", paciente?.p_nome);
      writeKeyValue(doc, "CPF", paciente?.p_cpf);
      writeKeyValue(doc, "Telefone", paciente?.p_fone);
      writeKeyValue(
        doc,
        "Nascimento",
        paciente?.p_nascimento
          ? `${toDateBR(paciente.p_nascimento)}${idade !== null ? ` (${idade} anos)` : ""}`
          : "-",
      );

      sectionTitle(doc, `Consultas (${consultas.length})`);
      if (!consultas.length) {
        doc.text("Sem consultas anteriores.");
        return;
      }

      for (const c of consultas) {
        doc
          .moveDown(0.5)
          .font("Helvetica-Bold")
          .text(`#${c.id_consulta} • ${toDateBR(c.c_dataConsulta || c.created_at)} • ${c.c_especialidade || "Geral"}`);
        doc.font("Helvetica");

        const resumo = [
          c.c_queixaPessoal ? `Queixa: ${c.c_queixaPessoal}` : null,
          c.c_diagnostico ? `Dx: ${c.c_diagnostico}` : null,
          c.c_condutaConsulta ? `Plano: ${c.c_condutaConsulta}` : null,
        ]
          .filter(Boolean)
          .join("\n");

        doc.text(resumo || "(sem detalhes)");

        // quebra de página de forma simples
        if (doc.y > 740) doc.addPage();
      }

      doc.moveDown(1);
      doc
        .fontSize(9)
        .fillColor("gray")
        .text("Documento gerado pelo sistema OftalmoFlow", { align: "center" });
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao gerar PDF do histórico." });
  }
});

// ===== JSON: histórico do paciente (até 50) =====
router.get("/:id_paciente", async (req, res) => {
  try {
    const id_paciente = Number(req.params.id_paciente);

    const consultas = await prisma.consulta.findMany({
      where: { id_paciente },
      orderBy: { created_at: "desc" },
      take: 50,
    });

    res.json(consultas);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar histórico." });
  }
});

// ===== POST: cria (salva) consulta/prontuário =====
router.post("/", async (req, res) => {
  try {
    const schema = z
      .object({
        id_paciente: z.number().int().positive(),

        // obrigatórios (dados de qualidade)
        c_especialidade: z.string().trim().min(2, "Especialidade é obrigatória"),
        c_queixaPessoal: z.string().trim().min(2, "Queixa principal é obrigatória"),
        c_diagnostico: z.string().trim().min(2, "Diagnóstico é obrigatório"),
        c_condutaConsulta: z.string().trim().min(2, "Conduta/Plano é obrigatória"),
        c_medicacoesEmUso: z.string().trim().min(1, "Medicações em uso é obrigatório"),
        c_alergias: z.string().trim().min(1, "Alergias é obrigatório"),

        // opcionais
        c_receita: z.string().optional().nullable(),
        c_exameFisico: z.string().optional().nullable(),
        c_historicoPessoal: z.string().optional().nullable(),
        c_historicoFamiliar: z.string().optional().nullable(),
        c_geral: z.string().optional().nullable(),

        // oftalmo (opcional)
        c_acuidadeOd: z.string().optional().nullable(),
        c_acuidadeOe: z.string().optional().nullable(),
        c_bioOd: z.string().optional().nullable(),
        c_bioOe: z.string().optional().nullable(),
        c_fundoOlhoOd: z.string().optional().nullable(),
        c_fundoOlhoOe: z.string().optional().nullable(),
        c_pressaoOcularOd: z.string().optional().nullable(),
        c_pressaoOcularOe: z.string().optional().nullable(),

        // data da consulta (YYYY-MM-DD). se não vier, usamos hoje.
        c_dataConsulta: z.string().optional().nullable(),
      })
      .strict();

    const data = schema.parse(req.body);

    const dataConsulta = data.c_dataConsulta ? new Date(data.c_dataConsulta) : new Date();

    const consulta = await prisma.consulta.create({
      data: {
        id_paciente: data.id_paciente,

        c_especialidade: data.c_especialidade,
        c_queixaPessoal: data.c_queixaPessoal,
        c_diagnostico: data.c_diagnostico,
        c_condutaConsulta: data.c_condutaConsulta,
        c_medicacoesEmUso: data.c_medicacoesEmUso,
        c_alergias: data.c_alergias,
        c_receita: data.c_receita || "",
        c_exameFisico: data.c_exameFisico || "",

        c_historicoPessoal: data.c_historicoPessoal || null,
        c_historicoFamiliar: data.c_historicoFamiliar || null,

        c_acuidadeOd: data.c_acuidadeOd || null,
        c_acuidadeOe: data.c_acuidadeOe || null,
        c_bioOd: data.c_bioOd || null,
        c_bioOe: data.c_bioOe || null,
        c_fundoOlhoOd: data.c_fundoOlhoOd || null,
        c_fundoOlhoOe: data.c_fundoOlhoOe || null,
        c_pressaoOcularOd: data.c_pressaoOcularOd || null,
        c_pressaoOcularOe: data.c_pressaoOcularOe || null,

        c_geral: data.c_geral || null,
        c_dataConsulta: dataConsulta,
      },
    });

    res.status(201).json(consulta);
  } catch (e) {
    // zod -> 400 com mensagens úteis
    if (e?.issues) {
      return res.status(400).json({
        error: "Dados inválidos para prontuário.",
        issues: e.issues.map((x) => ({ path: x.path, message: x.message })),
      });
    }
    console.error(e);
    res.status(400).json({ error: "Dados inválidos para prontuário." });
  }
});

module.exports = { consultasRouter: router };
