// src/components/PacienteModal.jsx
// Modal de detalhes do paciente (dados + histórico) com modo EDIÇÃO.
// Fluxo:
// - Abre -> carrega paciente + consultas
// - Botão "Editar" -> habilita inputs
// - "Salvar alterações" -> PUT /api/pacientes/:id
// - Após salvar -> recarrega detalhes e mantém histórico atualizado

import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPut, apiDelete } from "../api";

function normalizeStr(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isOftalmoRecord(c) {
  const esp = normalizeStr(c?.c_especialidade);
  if (esp.includes("oftal")) return true;

  // Compatibilidade: registros antigos não tinham especialidade.
  // Se existir algum campo típico de oftalmologia, tratamos como oftalmo.
  const hasOph = [
    c?.c_acuidadeOd,
    c?.c_acuidadeOe,
    c?.c_pressaoOcularOd,
    c?.c_pressaoOcularOe,
    c?.c_bioOd,
    c?.c_bioOe,
    c?.c_fundoOlhoOd,
    c?.c_fundoOlhoOe,
  ].some((v) => String(v || "").trim().length > 0);

  return !esp && hasOph;
}

function dateToInput(dateValue) {
  if (!dateValue) return "";
  const d = new Date(dateValue);
  // Ajusta para não dar “um dia a menos” dependendo do fuso:
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function PacienteModal({
  aberto,
  onFechar,
  idPaciente,
  onMudou,
}) {
  const [loading, setLoading] = useState(false);

  const [paciente, setPaciente] = useState(null);
  const [consultas, setConsultas] = useState([]);

  // Modo edição
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Form de edição (cópia do paciente)
  const [form, setForm] = useState({
    p_nome: "",
    p_mae: "",
    p_cpf: "",
    p_rg: "",
    p_nascimento: "",
    p_fone: "",
    p_endereco: "",
    p_cidade: "",
  });

  async function carregar() {
    if (!aberto || !idPaciente) return;
    setLoading(true);
    try {
      const data = await apiGet(`/api/pacientes/${idPaciente}`);
      setPaciente(data.paciente);
      setConsultas(data.consultas || []);

      // Preenche o form (para edição)
      const p = data.paciente || {};
      setForm({
        p_nome: p.p_nome || "",
        p_mae: p.p_mae || "",
        p_cpf: p.p_cpf || "",
        p_rg: p.p_rg || "",
        p_nascimento: dateToInput(p.p_nascimento),
        p_fone: p.p_fone || "",
        p_endereco: p.p_endereco || "",
        p_cidade: p.p_cidade || "",
      });
    } catch (e) {
      console.error(e);
      alert("Erro ao carregar detalhes do paciente.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // quando abrir, entra em modo “visualização”
    if (aberto) setEditando(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, idPaciente]);

  const mudouAlgo = useMemo(() => {
    if (!paciente) return false;

    const original = {
      p_nome: paciente.p_nome || "",
      p_mae: paciente.p_mae || "",
      p_cpf: paciente.p_cpf || "",
      p_rg: paciente.p_rg || "",
      p_nascimento: dateToInput(paciente.p_nascimento),
      p_fone: paciente.p_fone || "",
      p_endereco: paciente.p_endereco || "",
      p_cidade: paciente.p_cidade || "",
    };

    return Object.keys(original).some(
      (k) => String(original[k]) !== String(form[k]),
    );
  }, [paciente, form]);

  function cancelarEdicao() {
    // volta o form ao estado original (dados do paciente)
    if (!paciente) return;
    setForm({
      p_nome: paciente.p_nome || "",
      p_mae: paciente.p_mae || "",
      p_cpf: paciente.p_cpf || "",
      p_rg: paciente.p_rg || "",
      p_nascimento: dateToInput(paciente.p_nascimento),
      p_fone: paciente.p_fone || "",
      p_endereco: paciente.p_endereco || "",
      p_cidade: paciente.p_cidade || "",
    });
    setEditando(false);
  }

  async function salvarAlteracoes() {
    if (!idPaciente) return;
    if (!form.p_nome || form.p_nome.trim().length < 2) {
      alert("O nome precisa ter pelo menos 2 letras.");
      return;
    }

    setSalvando(true);
    try {
      // Monta payload com os campos do form.
      // Se quiser permitir limpar campo: mandar "" vira null em alguns casos.
      const payload = {
        p_nome: form.p_nome.trim(),
        p_mae: form.p_mae?.trim() || null,
        p_cpf: form.p_cpf?.trim() || null,
        p_rg: form.p_rg?.trim() || null,
        p_nascimento: form.p_nascimento || null, // YYYY-MM-DD
        p_fone: form.p_fone?.trim() || null,
        p_endereco: form.p_endereco?.trim() || null,
        p_cidade: form.p_cidade?.trim() || null,
      };

      await apiPut(`/api/pacientes/${idPaciente}`, payload);

      alert("Dados do paciente atualizados!");
      setEditando(false);
      await carregar(); // recarrega e sincroniza
      if (typeof onMudou === "function") onMudou();
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar alterações. Veja o console.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluirPaciente() {
    if (!paciente?.id_paciente) return;

    // Confirmação bem explícita (para evitar exclusão errada)
    const ok = window.confirm(
      `ATENÇÃO!\n\nVocê vai EXCLUIR o paciente:\n` +
        `Ficha: ${paciente.id_paciente}\n` +
        `Nome: ${paciente.p_nome}\n\n` +
        `Isso também remove histórico (consultas) e registros de fila desse paciente.\n\n` +
        `Deseja continuar?`,
    );

    if (!ok) return;

    try {
      await apiDelete(`/api/pacientes/${paciente.id_paciente}`);
      alert("Paciente excluído com sucesso!");
      onFechar();
      if (typeof onMudou === "function") onMudou();
    } catch (e) {
      console.error(e);
      alert(
        `Não foi possível excluir.\n\nMotivo: ${e?.message || "Erro desconhecido"}`,
      );
    }
  }

  if (!aberto) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100"
      style={{ background: "rgba(0,0,0,0.4)", zIndex: 9999 }}
      onClick={() => onFechar()}
    >
      <div
        className="card"
        style={{
          width: "95vw",
          maxWidth: 900,
          margin: "16px auto",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header fixo */}
        <div className="p-2 border-bottom d-flex justify-content-between align-items-start">
          <div>
            <div className="fw-bold" style={{ fontSize: 18 }}>
              Detalhes do paciente
            </div>
            <div className="text-secondary" style={{ fontSize: 12 }}>
              <b>Ficha:</b> {idPaciente}
              {paciente?.p_nome ? (
                <>
                  {" "}
                  &nbsp; | &nbsp; <b>Nome:</b> {paciente.p_nome}
                </>
              ) : null}
            </div>
          </div>
          <div className="d-flex gap-2">
            {!editando ? (
              <>
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => setEditando(true)}
                  disabled={loading}
                >
                  Editar
                </button>

                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={excluirPaciente}
                  disabled={loading}
                  title="Exclui o paciente (com confirmação)"
                >
                  Excluir paciente
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={cancelarEdicao}
                  disabled={salvando}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={salvarAlteracoes}
                  disabled={salvando || !mudouAlgo}
                  title={!mudouAlgo ? "Nenhuma alteração" : "Salvar alterações"}
                >
                  {salvando ? "Salvando..." : "Salvar alterações"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Corpo scrollável */}
        <div className="p-2" style={{ overflow: "auto" }}>
          {loading ? (
            <div>Carregando...</div>
          ) : (
            <>
              {/* Dados do paciente */}
              <div className="card p-2 mb-2">
                <div className="fw-semibold mb-2">
                  Dados cadastrais{" "}
                  {editando ? (
                    <span className="badge bg-warning text-dark ms-2">
                      EDITANDO
                    </span>
                  ) : null}
                </div>

                {/* VISUALIZAÇÃO: mostra como antes.
                    EDIÇÃO: inputs compactos */}
                {!editando ? (
                  <div className="row g-2" style={{ fontSize: 13 }}>
                    <div className="col-md-6">
                      <b>Nome:</b> {paciente?.p_nome || "-"}
                    </div>
                    <div className="col-md-6">
                      <b>Mãe:</b> {paciente?.p_mae || "-"}
                    </div>

                    <div className="col-md-4">
                      <b>CPF:</b> {paciente?.p_cpf || "-"}
                    </div>
                    <div className="col-md-4">
                      <b>RG:</b> {paciente?.p_rg || "-"}
                    </div>
                    <div className="col-md-4">
                      <b>Nascimento:</b>{" "}
                      {paciente?.p_nascimento
                        ? new Date(paciente.p_nascimento).toLocaleDateString()
                        : "-"}
                    </div>

                    <div className="col-md-4">
                      <b>Telefone:</b> {paciente?.p_fone || "-"}
                    </div>
                    <div className="col-md-8">
                      <b>Endereço:</b> {paciente?.p_endereco || "-"}
                    </div>

                    <div className="col-md-4">
                      <b>Cidade:</b> {paciente?.p_cidade || "-"}
                    </div>

                    <div className="col-md-8">
                      <b>Cadastro em:</b>{" "}
                      {paciente?.p_data
                        ? new Date(paciente.p_data).toLocaleDateString()
                        : "-"}
                    </div>
                  </div>
                ) : (
                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="form-label small mb-1">Nome *</label>
                      <input
                        className="form-control form-control-sm"
                        value={form.p_nome}
                        onChange={(e) =>
                          setForm({ ...form, p_nome: e.target.value })
                        }
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small mb-1">Mãe</label>
                      <input
                        className="form-control form-control-sm"
                        value={form.p_mae}
                        onChange={(e) =>
                          setForm({ ...form, p_mae: e.target.value })
                        }
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small mb-1">CPF</label>
                      <input
                        className="form-control form-control-sm"
                        value={form.p_cpf}
                        onChange={(e) =>
                          setForm({ ...form, p_cpf: e.target.value })
                        }
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small mb-1">RG</label>
                      <input
                        className="form-control form-control-sm"
                        value={form.p_rg}
                        onChange={(e) =>
                          setForm({ ...form, p_rg: e.target.value })
                        }
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small mb-1">
                        Nascimento
                      </label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={form.p_nascimento}
                        onChange={(e) =>
                          setForm({ ...form, p_nascimento: e.target.value })
                        }
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small mb-1">Telefone</label>
                      <input
                        className="form-control form-control-sm"
                        value={form.p_fone}
                        onChange={(e) =>
                          setForm({ ...form, p_fone: e.target.value })
                        }
                      />
                    </div>

                    <div className="col-md-8">
                      <label className="form-label small mb-1">Endereço</label>
                      <input
                        className="form-control form-control-sm"
                        value={form.p_endereco}
                        onChange={(e) =>
                          setForm({ ...form, p_endereco: e.target.value })
                        }
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small mb-1">Cidade</label>
                      <input
                        className="form-control form-control-sm"
                        value={form.p_cidade}
                        onChange={(e) =>
                          setForm({ ...form, p_cidade: e.target.value })
                        }
                      />
                    </div>

                    <div className="col-12">
                      <div className="text-secondary" style={{ fontSize: 12 }}>
                        * Ao salvar, o CPF “normalizado” (somente números) é
                        atualizado automaticamente no banco para facilitar
                        busca.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Histórico */}
              <div className="card p-2">
                <div className="fw-semibold mb-2">Histórico de consultas</div>

                {consultas.length === 0 ? (
                  <div className="text-secondary" style={{ fontSize: 13 }}>
                    Sem consultas registradas.
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {consultas.map((c) => (
                      <details
                        key={c.id_consulta}
                        className="border rounded p-2 bg-light"
                      >
                        <summary style={{ cursor: "pointer" }}>
                          <b>
                            {c.c_dataConsulta
                              ? new Date(c.c_dataConsulta).toLocaleDateString()
                              : "Sem data"}
                          </b>
                          {"  "}
                          <span className="text-secondary">
                            — #{c.id_consulta} — {c.c_especialidade || "Geral"}{" "}
                            —{" "}
                            {(
                              c.c_diagnostico ||
                              c.c_queixaPessoal ||
                              "(sem resumo)"
                            ).slice(0, 60)}
                          </span>
                        </summary>

                        <div className="mt-2" style={{ fontSize: 13 }}>
                          {(() => {
                            const showOph = isOftalmoRecord(c);
                            const esp = c.c_especialidade || "Geral";

                            return (
                              <>
                                <div>
                                  <b>Especialidade:</b> {esp}
                                </div>
                                <div className="mt-1">
                                  <b>Queixa:</b> {c.c_queixaPessoal || "-"}
                                </div>
                                <div className="mt-1">
                                  <b>Diagnóstico:</b> {c.c_diagnostico || "-"}
                                </div>
                                <div className="mt-1">
                                  <b>Conduta / Plano:</b>{" "}
                                  {c.c_condutaConsulta || "-"}
                                </div>

                                <div className="row g-2 mt-1">
                                  <div className="col-md-6">
                                    <b>Medicações em uso:</b>{" "}
                                    {c.c_medicacoesEmUso || "-"}
                                  </div>
                                  <div className="col-md-6">
                                    <b>Alergias:</b> {c.c_alergias || "-"}
                                  </div>
                                </div>

                                {c.c_exameFisico ? (
                                  <div className="mt-1">
                                    <b>Exame físico / Achados:</b>{" "}
                                    {c.c_exameFisico}
                                  </div>
                                ) : null}

                                {c.c_receita ? (
                                  <div className="mt-1">
                                    <b>Receita:</b> {c.c_receita}
                                  </div>
                                ) : null}

                                {showOph ? (
                                  <>
                                    <div className="mt-2">
                                      <b>Oftalmologia</b>
                                    </div>

                                    <div className="row g-2 mt-1">
                                      <div className="col-md-6">
                                        <b>Acuidade OD:</b>{" "}
                                        {c.c_acuidadeOd || "-"}
                                      </div>
                                      <div className="col-md-6">
                                        <b>Acuidade OE:</b>{" "}
                                        {c.c_acuidadeOe || "-"}
                                      </div>
                                      <div className="col-md-6">
                                        <b>Pressão OD:</b>{" "}
                                        {c.c_pressaoOcularOd || "-"}
                                      </div>
                                      <div className="col-md-6">
                                        <b>Pressão OE:</b>{" "}
                                        {c.c_pressaoOcularOe || "-"}
                                      </div>
                                    </div>

                                    {(c.c_bioOd ||
                                      c.c_bioOe ||
                                      c.c_fundoOlhoOd ||
                                      c.c_fundoOlhoOe) && (
                                      <div className="mt-1">
                                        <b>Exame detalhado:</b>
                                        <div className="row g-2 mt-1">
                                          <div className="col-md-6">
                                            <b>BIO OD:</b> {c.c_bioOd || "-"}
                                          </div>
                                          <div className="col-md-6">
                                            <b>BIO OE:</b> {c.c_bioOe || "-"}
                                          </div>
                                          <div className="col-md-6">
                                            <b>Fundo OD:</b>{" "}
                                            {c.c_fundoOlhoOd || "-"}
                                          </div>
                                          <div className="col-md-6">
                                            <b>Fundo OE:</b>{" "}
                                            {c.c_fundoOlhoOe || "-"}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                ) : null}

                                {c.c_geral ? (
                                  <div className="mt-1">
                                    <b>Obs:</b> {c.c_geral}
                                  </div>
                                ) : null}
                              </>
                            );
                          })()}
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
