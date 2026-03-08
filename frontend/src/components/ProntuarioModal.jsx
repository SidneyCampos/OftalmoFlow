// frontend/src/components/ProntuarioModal.jsx
// Prontuário genérico (multi-especialidade) + bloco opcional de Oftalmologia.
// Inclui campos obrigatórios + geração de PDF (consulta e histórico).

import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiGetBlob, apiPatch, apiPost } from "../api";
import { printProntuario } from "../utils/printProntuario";

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

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export default function ProntuarioModal({ aberto, onFechar, filaItem }) {
  const paciente = filaItem?.paciente;
  const idade = useMemo(
    () => calcAge(paciente?.p_nascimento),
    [paciente?.p_nascimento],
  );

  const [historico, setHistorico] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [ultimaConsultaId, setUltimaConsultaId] = useState(null);

  const [form, setForm] = useState({
    // Obrigatórios (multi-especialidade)
    c_especialidade: "Geral",
    c_queixaPessoal: "",
    c_diagnostico: "",
    c_condutaConsulta: "",
    c_medicacoesEmUso: "Nega",
    c_alergias: "Nega",

    // Opcionais
    c_receita: "",
    c_exameFisico: "",

    // Anamnese
    c_historicoPessoal: "",
    c_historicoFamiliar: "",

    // Oftalmologia (opcional)
    c_acuidadeOd: "",
    c_acuidadeOe: "",
    c_pressaoOcularOd: "",
    c_pressaoOcularOe: "",
    c_bioOd: "",
    c_bioOe: "",
    c_fundoOlhoOd: "",
    c_fundoOlhoOe: "",

    // Observações
    c_geral: "",
  });

  const CLINICA = {
    nome: "CREOI",
    endereco: "Centro de Referência em Oftalmologia de Iguatama",
    telefones: "",
    redes: "",
  };

  useEffect(() => {
    async function carregarHistorico() {
      if (!aberto || !paciente?.id_paciente) return;
      try {
        const h = await apiGet(`/api/consultas/${paciente.id_paciente}`);
        setHistorico(Array.isArray(h) ? h : []);
      } catch (e) {
        console.error(e);
        setHistorico([]);
      }
    }

    // ao abrir, zera “ultima consulta” (pra não confundir paciente)
    if (aberto) setUltimaConsultaId(null);

    carregarHistorico();
  }, [aberto, paciente?.id_paciente]);

  if (!aberto) return null;

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function validarObrigatorios() {
    const reqs = [
      ["c_especialidade", "Especialidade"],
      ["c_queixaPessoal", "Queixa principal"],
      ["c_diagnostico", "Diagnóstico"],
      ["c_condutaConsulta", "Conduta / Plano"],
      ["c_medicacoesEmUso", "Medicações em uso"],
      ["c_alergias", "Alergias"],
    ];

    const faltando = reqs
      .filter(([k]) => !String(form[k] || "").trim())
      .map(([, label]) => label);

    if (faltando.length) {
      alert(
        "Preencha os campos obrigatórios:\n\n- " +
          faltando.join("\n- ") +
          "\n\nDica: se não houver, use 'Nega' (ex.: Alergias / Medicações).",
      );
      return false;
    }

    return true;
  }

  async function salvar() {
    if (!paciente?.id_paciente) return false;
    if (!validarObrigatorios()) return false;

    setSalvando(true);
    try {
      const payload = { id_paciente: paciente.id_paciente, ...form };
      const nova = await apiPost("/api/consultas", payload);

      setUltimaConsultaId(nova?.id_consulta || null);
      alert(`Prontuário salvo! Consulta #${nova.id_consulta}`);

      const h = await apiGet(`/api/consultas/${paciente.id_paciente}`);
      setHistorico(Array.isArray(h) ? h : []);

      return true;
    } catch (e) {
      console.error(e);

      // se o backend devolver issues do Zod
      const msg = e?.message || "Erro ao salvar prontuário.";
      alert(msg);
      return false;
    } finally {
      setSalvando(false);
    }
  }

  async function finalizarConsulta() {
    const ok = await salvar();
    if (!ok) return;

    try {
      // abre impressão automaticamente
      imprimirHtml();

      await apiPatch(`/api/fila/${filaItem.id_fila}`, { acao: "finalizar" });

      onFechar(true);
    } catch (e) {
      console.error(e);
      alert("Erro ao finalizar consulta.");
    }
  }

  async function baixarPdfConsulta(id_consulta) {
    try {
      const blob = await apiGetBlob(`/api/consultas/pdf/${id_consulta}`);
      downloadBlob(blob, `consulta-${id_consulta}.pdf`);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Erro ao gerar PDF.");
    }
  }

  async function baixarPdfHistorico() {
    try {
      const blob = await apiGetBlob(
        `/api/consultas/historico/pdf/${paciente.id_paciente}`,
      );
      downloadBlob(blob, `historico-${paciente.id_paciente}.pdf`);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Erro ao gerar PDF do histórico.");
    }
  }

  function imprimirHtml() {
    printProntuario({
      clinica: CLINICA,
      logoUrl: "/logo-creoi.png",
      paciente: {
        id_paciente: paciente?.id_paciente,
        p_nome: paciente?.p_nome,
        p_cpf: paciente?.p_cpf,
        p_fone: paciente?.p_fone,
        p_nascimento: paciente?.p_nascimento,
      },
      consulta: {
        ...form,
        c_dataConsulta: new Date(),
      },
    });
  }

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100"
      style={{ background: "rgba(0,0,0,0.4)", zIndex: 9999 }}
      onClick={() => onFechar(false)}
    >
      <div
        className="card"
        style={{
          width: "95vw",
          maxWidth: 980,
          margin: "16px auto",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          className="p-3 border-bottom d-flex justify-content-between align-items-start"
          style={{ background: "white" }}
        >
          <div style={{ minWidth: 0 }}>
            <div className="fw-bold" style={{ fontSize: 18 }}>
              Prontuário
            </div>

            {/* Identificação “bem visível” */}
            <div
              className="fw-bold"
              style={{ fontSize: 20, lineHeight: 1.1, marginTop: 6 }}
            >
              {paciente?.p_nome}
            </div>

            <div className="text-secondary" style={{ fontSize: 12 }}>
              <b>Ficha:</b> {paciente?.id_paciente} &nbsp; | &nbsp;
              <b>CPF:</b> {paciente?.p_cpf || "-"} &nbsp; | &nbsp;
              <b>Nasc.:</b> {toDateBR(paciente?.p_nascimento)}
              {idade !== null ? ` (${idade}a)` : ""}
            </div>
          </div>

          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => onFechar(false)}
          >
            Fechar
          </button>
        </div>

        {/* CONTEÚDO */}
        <div className="p-2" style={{ overflow: "auto" }}>
          <div className="accordion" id="accProntuario">
            {/* 1) ESSENCIAL (OBRIGATÓRIO) */}
            <div className="accordion-item">
              <h2 className="accordion-header" id="hEssencial">
                <button
                  className="accordion-button"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#cEssencial"
                  aria-expanded="true"
                  aria-controls="cEssencial"
                >
                  Essencial (obrigatório)
                </button>
              </h2>

              <div
                id="cEssencial"
                className="accordion-collapse collapse show"
                aria-labelledby="hEssencial"
                data-bs-parent="#accProntuario"
              >
                <div className="accordion-body">
                  <div className="row g-2">
                    <div className="col-12 col-md-4">
                      <label className="form-label small mb-1">
                        Especialidade <span className="text-danger">*</span>
                      </label>
                      <input
                        className="form-control form-control-sm"
                        value={form.c_especialidade}
                        onChange={(e) =>
                          setField("c_especialidade", e.target.value)
                        }
                        placeholder="Ex.: Clínica geral, Geriatria, Oftalmologia"
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small mb-1">
                        Queixa principal <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        value={form.c_queixaPessoal}
                        onChange={(e) =>
                          setField("c_queixaPessoal", e.target.value)
                        }
                        placeholder="Ex.: dor, febre, visão embaçada, tontura..."
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small mb-1">
                        Diagnóstico <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        value={form.c_diagnostico}
                        onChange={(e) =>
                          setField("c_diagnostico", e.target.value)
                        }
                        placeholder="Ex.: HAS descompensada, conjuntivite, IVAS..."
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small mb-1">
                        Conduta / Plano <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        value={form.c_condutaConsulta}
                        onChange={(e) =>
                          setField("c_condutaConsulta", e.target.value)
                        }
                        placeholder="Ex.: medicação, retorno, exames, orientações..."
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small mb-1">
                        Medicações em uso <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        value={form.c_medicacoesEmUso}
                        onChange={(e) =>
                          setField("c_medicacoesEmUso", e.target.value)
                        }
                        placeholder="Se não usa, escreva: Nega"
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small mb-1">
                        Alergias <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        value={form.c_alergias}
                        onChange={(e) => setField("c_alergias", e.target.value)}
                        placeholder="Se não tem, escreva: Nega"
                      />
                    </div>

                    <div className="col-12">
                      <div
                        className="alert alert-info py-2 mb-0"
                        style={{ fontSize: 12 }}
                      >
                        <b>Qualidade dos dados:</b> estes campos são
                        obrigatórios para gerar relatórios melhores na
                        dashboard.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2) RECEITA (OPCIONAL) */}
            <div className="accordion-item">
              <h2 className="accordion-header" id="hReceita">
                <button
                  className="accordion-button collapsed"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#cReceita"
                  aria-expanded="false"
                  aria-controls="cReceita"
                >
                  Receita (opcional)
                </button>
              </h2>
              <div
                id="cReceita"
                className="accordion-collapse collapse"
                aria-labelledby="hReceita"
                data-bs-parent="#accProntuario"
              >
                <div className="accordion-body">
                  <label className="form-label small mb-1">
                    Texto da receita
                  </label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={5}
                    value={form.c_receita}
                    onChange={(e) => setField("c_receita", e.target.value)}
                    placeholder="Ex.: Prescrever ... (dose, via, horários, dias)"
                  />
                </div>
              </div>
            </div>

            {/* 3) EXAME FÍSICO / ACHADOS (OPCIONAL) */}
            <div className="accordion-item">
              <h2 className="accordion-header" id="hExame">
                <button
                  className="accordion-button collapsed"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#cExame"
                  aria-expanded="false"
                  aria-controls="cExame"
                >
                  Exame físico / Achados (opcional)
                </button>
              </h2>
              <div
                id="cExame"
                className="accordion-collapse collapse"
                aria-labelledby="hExame"
                data-bs-parent="#accProntuario"
              >
                <div className="accordion-body">
                  <label className="form-label small mb-1">Descrição</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={4}
                    value={form.c_exameFisico}
                    onChange={(e) => setField("c_exameFisico", e.target.value)}
                    placeholder="Ex.: PA, FC, ausculta, inspeção, sinais clínicos..."
                  />
                </div>
              </div>
            </div>

            {/* 4) ANAMNESE (OPCIONAL) */}
            <div className="accordion-item">
              <h2 className="accordion-header" id="hAnamnese">
                <button
                  className="accordion-button collapsed"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#cAnamnese"
                  aria-expanded="false"
                  aria-controls="cAnamnese"
                >
                  Anamnese / Antecedentes (opcional)
                </button>
              </h2>
              <div
                id="cAnamnese"
                className="accordion-collapse collapse"
                aria-labelledby="hAnamnese"
                data-bs-parent="#accProntuario"
              >
                <div className="accordion-body">
                  <div className="row g-2">
                    <div className="col-12">
                      <label className="form-label small mb-1">
                        Histórico pessoal
                      </label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={3}
                        value={form.c_historicoPessoal}
                        onChange={(e) =>
                          setField("c_historicoPessoal", e.target.value)
                        }
                        placeholder="Doenças, cirurgias, hábitos, antecedentes..."
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small mb-1">
                        Histórico familiar
                      </label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={3}
                        value={form.c_historicoFamiliar}
                        onChange={(e) =>
                          setField("c_historicoFamiliar", e.target.value)
                        }
                        placeholder="Antecedentes familiares relevantes..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5) OFTALMOLOGIA (OPCIONAL) */}
            <div className="accordion-item">
              <h2 className="accordion-header" id="hOftalmo">
                <button
                  className="accordion-button collapsed"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#cOftalmo"
                  aria-expanded="false"
                  aria-controls="cOftalmo"
                >
                  Oftalmologia (opcional)
                </button>
              </h2>
              <div
                id="cOftalmo"
                className="accordion-collapse collapse"
                aria-labelledby="hOftalmo"
                data-bs-parent="#accProntuario"
              >
                <div className="accordion-body">
                  <div className="row g-2">
                    <div className="col-12">
                      <div className="small text-secondary mb-2">
                        Preencha apenas se a consulta for oftalmológica.
                      </div>
                    </div>

                    <div className="col-6">
                      <label className="form-label small mb-1">
                        Acuidade OD
                      </label>
                      <input
                        className="form-control form-control-sm"
                        value={form.c_acuidadeOd}
                        onChange={(e) =>
                          setField("c_acuidadeOd", e.target.value)
                        }
                        placeholder="Ex.: 20/20"
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label small mb-1">
                        Acuidade OE
                      </label>
                      <input
                        className="form-control form-control-sm"
                        value={form.c_acuidadeOe}
                        onChange={(e) =>
                          setField("c_acuidadeOe", e.target.value)
                        }
                        placeholder="Ex.: 20/40"
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label small mb-1">
                        Pressão OD
                      </label>
                      <input
                        className="form-control form-control-sm"
                        value={form.c_pressaoOcularOd}
                        onChange={(e) =>
                          setField("c_pressaoOcularOd", e.target.value)
                        }
                        placeholder="Ex.: 14"
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label small mb-1">
                        Pressão OE
                      </label>
                      <input
                        className="form-control form-control-sm"
                        value={form.c_pressaoOcularOe}
                        onChange={(e) =>
                          setField("c_pressaoOcularOe", e.target.value)
                        }
                        placeholder="Ex.: 16"
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label small mb-1">BIO OD</label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        value={form.c_bioOd}
                        onChange={(e) => setField("c_bioOd", e.target.value)}
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label small mb-1">BIO OE</label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        value={form.c_bioOe}
                        onChange={(e) => setField("c_bioOe", e.target.value)}
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label small mb-1">Fundo OD</label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        value={form.c_fundoOlhoOd}
                        onChange={(e) =>
                          setField("c_fundoOlhoOd", e.target.value)
                        }
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label small mb-1">Fundo OE</label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        value={form.c_fundoOlhoOe}
                        onChange={(e) =>
                          setField("c_fundoOlhoOe", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 6) OBSERVAÇÕES */}
            <div className="accordion-item">
              <h2 className="accordion-header" id="hObs">
                <button
                  className="accordion-button collapsed"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#cObs"
                  aria-expanded="false"
                  aria-controls="cObs"
                >
                  Observações (opcional)
                </button>
              </h2>
              <div
                id="cObs"
                className="accordion-collapse collapse"
                aria-labelledby="hObs"
                data-bs-parent="#accProntuario"
              >
                <div className="accordion-body">
                  <label className="form-label small mb-1">
                    Observações gerais
                  </label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={4}
                    value={form.c_geral}
                    onChange={(e) => setField("c_geral", e.target.value)}
                    placeholder="Qualquer detalhe extra."
                  />
                </div>
              </div>
            </div>

            {/* 7) HISTÓRICO DO PACIENTE */}
            <div className="accordion-item">
              <h2 className="accordion-header" id="hHistorico">
                <button
                  className="accordion-button collapsed"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#cHistorico"
                  aria-expanded="false"
                  aria-controls="cHistorico"
                >
                  Histórico do paciente (consultas anteriores)
                </button>
              </h2>
              <div
                id="cHistorico"
                className="accordion-collapse collapse"
                aria-labelledby="hHistorico"
                data-bs-parent="#accProntuario"
              >
                <div className="accordion-body">
                  {historico.length === 0 ? (
                    <div className="text-secondary" style={{ fontSize: 13 }}>
                      Sem consultas anteriores.
                    </div>
                  ) : (
                    <div
                      className="d-flex flex-column gap-2"
                      style={{ maxHeight: 280, overflow: "auto" }}
                    >
                      {historico.map((c) => (
                        <div
                          key={c.id_consulta}
                          className="border rounded p-2 bg-light"
                        >
                          <div className="d-flex justify-content-between align-items-start gap-2">
                            <div>
                              <div
                                className="fw-semibold"
                                style={{ fontSize: 13 }}
                              >
                                #{c.id_consulta} —{" "}
                                {toDateBR(c.c_dataConsulta || c.created_at)}
                              </div>
                              <div
                                className="text-secondary"
                                style={{ fontSize: 12 }}
                              >
                                <b>{c.c_especialidade || "Geral"}</b> •{" "}
                                {c.c_diagnostico || "(sem diagnóstico)"}
                              </div>
                              <div
                                className="text-secondary"
                                style={{ fontSize: 12 }}
                              >
                                {c.c_queixaPessoal
                                  ? c.c_queixaPessoal.slice(0, 110)
                                  : "(sem queixa)"}
                              </div>
                            </div>

                            <button
                              className="btn btn-outline-secondary btn-sm"
                              type="button"
                              onClick={() => baixarPdfConsulta(c.id_consulta)}
                            >
                              PDF
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="d-flex justify-content-end mt-2">
                    <button
                      className="btn btn-outline-primary btn-sm"
                      type="button"
                      onClick={baixarPdfHistorico}
                    >
                      Baixar histórico em PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-secondary mt-2" style={{ fontSize: 12 }}>
            Dica: deixe “Essencial” bem preenchido. Os blocos opcionais são
            “quando precisar”.
          </div>
        </div>

        {/* RODAPÉ FIXO */}
        <div
          className="p-2 border-top d-flex justify-content-end gap-2 flex-wrap"
          style={{ background: "white" }}
        >
          <button
            className="btn btn-primary btn-sm"
            disabled={salvando}
            onClick={salvar}
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>

          <button
            className="btn btn-success btn-sm"
            disabled={salvando}
            onClick={finalizarConsulta}
          >
            Finalizar consulta
          </button>

          <button
            className="btn btn-outline-secondary btn-sm"
            type="button"
            disabled={!ultimaConsultaId}
            onClick={() => baixarPdfConsulta(ultimaConsultaId)}
            title={
              ultimaConsultaId
                ? "Baixar PDF da última consulta salva"
                : "Salve a consulta para gerar o PDF"
            }
          >
            PDF desta consulta
          </button>

          <button
            className="btn btn-outline-secondary btn-sm"
            type="button"
            onClick={imprimirHtml}
          >
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
