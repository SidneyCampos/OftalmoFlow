// src/pages/Recepcao.jsx
// Tela da recepção: pesquisar pacientes, cadastrar e enviar para fila.
// Também abre modal de detalhes (dados + histórico) ao clicar no paciente.

import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../api";
import PacienteModal from "../components/PacienteModal";

function useDebounced(value, delayMs) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return v;
}

export default function Recepcao() {
  const [busca, setBusca] = useState("");
  const buscaDebounced = useDebounced(busca, 300);

  const [pacientes, setPacientes] = useState([]);
  const [filaHoje, setFilaHoje] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal de detalhes do paciente
  const [detalheAberto, setDetalheAberto] = useState(false);
  const [idPacienteDetalhe, setIdPacienteDetalhe] = useState(null);

  // Modal de cadastro
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    p_nome: "",
    p_mae: "",
    p_cpf: "",
    p_fone: "",
    p_nascimento: "",
    p_endereco: "",
    p_cidade: "",
    p_rg: "",
  });

  async function carregar() {
    setLoading(true);
    try {
      const [pacs, fila] = await Promise.all([
        apiGet(`/api/pacientes?busca=${encodeURIComponent(buscaDebounced)}`),
        apiGet(`/api/fila`),
      ]);
      setPacientes(pacs);
      setFilaHoje(fila);
    } catch (e) {
      console.error(e);
      alert("Erro ao carregar dados. Veja o console.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscaDebounced]);

  const idsNaFila = useMemo(() => {
    const set = new Set();
    filaHoje.forEach((f) => {
      if (["NA_FILA", "CHAMADO"].includes(f.status)) set.add(f.id_paciente);
    });
    return set;
  }, [filaHoje]);

  async function enviarParaFila(id_paciente) {
    try {
      await apiPost("/api/fila", { id_paciente });
      await carregar();
    } catch (e) {
      console.error(e);
      alert("Não foi possível enviar para fila (talvez já esteja na fila).");
    }
  }

  function abrirDetalhes(id_paciente) {
    setIdPacienteDetalhe(id_paciente);
    setDetalheAberto(true);
  }

  function fecharDetalhes() {
    setDetalheAberto(false);
    setIdPacienteDetalhe(null);
  }

  async function cadastrarPaciente(e) {
    e.preventDefault();
    try {
      const novo = await apiPost("/api/pacientes", form);
      setShowForm(false);
      setForm({
        p_nome: "",
        p_mae: "",
        p_cpf: "",
        p_fone: "",
        p_nascimento: "",
        p_endereco: "",
        p_cidade: "",
        p_rg: "",
      });
      alert(`Paciente cadastrado! Ficha: ${novo.id_paciente}`);
      await carregar();
    } catch (e2) {
      console.error(e2);
      alert("Erro ao cadastrar. Verifique os campos.");
    }
  }

  function BadgeStatus({ naFila }) {
    return naFila ? (
      <span className="badge bg-success">NA FILA</span>
    ) : (
      <span className="badge bg-secondary">FORA DA FILA</span>
    );
  }

  return (
    <div className="container-fluid">
      <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-2 mb-3">
        <div style={{ minWidth: 0 }}>
          <h2 className="mb-0">Recepção</h2>
          <div className="text-secondary">
            Buscar, cadastrar e enviar para fila
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          + Cadastrar paciente
        </button>
      </div>

      <div className="card p-3 mb-3">
        <input
          className="form-control"
          placeholder="Pesquisar por nome, mãe, CPF, telefone, cidade, endereço ou número da ficha..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <div className="text-secondary mt-2" style={{ fontSize: 12 }}>
          Dica: você pode buscar por “Maria” (nome/mãe), “37 9…” (telefone),
          “123.456…” (CPF) ou “12” (ficha).
        </div>
      </div>

      <div className="card p-3">
        {loading ? (
          <div>Carregando...</div>
        ) : (
          <>
            {/* ====== MOBILE: lista em cards (evita botões “sumirem” por causa da tabela) ====== */}
            <div className="d-md-none">
              {pacientes.length === 0 ? (
                <div className="text-center text-secondary py-4">
                  Nenhum paciente encontrado.
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {pacientes.map((p) => {
                    const naFila = idsNaFila.has(p.id_paciente);

                    return (
                      <div
                        key={p.id_paciente}
                        className="card p-2"
                        style={{ cursor: "pointer" }}
                        onClick={() => abrirDetalhes(p.id_paciente)}
                        title="Toque para ver detalhes e histórico"
                      >
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <div style={{ minWidth: 0 }}>
                            <div className="fw-bold" style={{ fontSize: 16 }}>
                              {p.p_nome}
                            </div>
                            <div className="text-secondary" style={{ fontSize: 12 }}>
                              Ficha: <span className="fw-semibold">{p.id_paciente}</span>
                              {p.p_cpf ? ` • CPF: ${p.p_cpf}` : ""}
                            </div>
                            <div className="text-secondary" style={{ fontSize: 12 }}>
                              Mãe: {p.p_mae || "-"}
                            </div>
                          </div>

                          <div>
                            <BadgeStatus naFila={naFila} />
                          </div>
                        </div>

                        <div className="d-flex gap-2 mt-2">
                          <button
                            className="btn btn-sm btn-outline-secondary flex-grow-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirDetalhes(p.id_paciente);
                            }}
                          >
                            Detalhes
                          </button>

                          <button
                            className="btn btn-sm btn-outline-primary flex-grow-1"
                            disabled={naFila}
                            onClick={(e) => {
                              e.stopPropagation();
                              enviarParaFila(p.id_paciente);
                            }}
                          >
                            Enviar p/ médico
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ====== DESKTOP: tabela (mantém como estava) ====== */}
            <div className="d-none d-md-block">
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Ficha</th>
                      <th>Nome</th>
                      <th>Mãe</th>
                      <th>CPF</th>
                      <th>Status</th>
                      <th className="text-end">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pacientes.map((p) => {
                      const naFila = idsNaFila.has(p.id_paciente);
                      return (
                        <tr
                          key={p.id_paciente}
                          style={{ cursor: "pointer" }}
                          onClick={() => abrirDetalhes(p.id_paciente)}
                          title="Clique para ver detalhes e histórico"
                        >
                          <td className="fw-bold">{p.id_paciente}</td>
                          <td>{p.p_nome}</td>
                          <td>{p.p_mae || "-"}</td>
                          <td>{p.p_cpf || "-"}</td>
                          <td>
                            <BadgeStatus naFila={naFila} />
                          </td>
                          <td className="text-end">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              disabled={naFila}
                              onClick={(e) => {
                                e.stopPropagation();
                                enviarParaFila(p.id_paciente);
                              }}
                            >
                              Enviar para médico
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {pacientes.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center text-secondary py-4">
                          Nenhum paciente encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de detalhes do paciente */}
      <PacienteModal
        aberto={detalheAberto}
        onFechar={fecharDetalhes}
        idPaciente={idPacienteDetalhe}
      />

      {/* Modal de cadastro */}
      {showForm && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setShowForm(false)}
        >
          <div
            className="card p-3"
            style={{
              width: "95vw",
              maxWidth: 700,
              margin: "16px auto",
              maxHeight: "92vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h5 className="mb-3">Cadastrar paciente</h5>

            <form onSubmit={cadastrarPaciente}>
              <div className="row g-2">
                <div className="col-md-6">
                  <label className="form-label">Nome *</label>
                  <input
                    className="form-control"
                    value={form.p_nome}
                    onChange={(e) => setForm({ ...form, p_nome: e.target.value })}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Mãe</label>
                  <input
                    className="form-control"
                    value={form.p_mae}
                    onChange={(e) => setForm({ ...form, p_mae: e.target.value })}
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">CPF</label>
                  <input
                    className="form-control"
                    value={form.p_cpf}
                    onChange={(e) => setForm({ ...form, p_cpf: e.target.value })}
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">RG</label>
                  <input
                    className="form-control"
                    value={form.p_rg}
                    onChange={(e) => setForm({ ...form, p_rg: e.target.value })}
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Telefone</label>
                  <input
                    className="form-control"
                    value={form.p_fone}
                    onChange={(e) => setForm({ ...form, p_fone: e.target.value })}
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Nascimento</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.p_nascimento}
                    onChange={(e) =>
                      setForm({ ...form, p_nascimento: e.target.value })
                    }
                  />
                </div>

                <div className="col-md-8">
                  <label className="form-label">Endereço</label>
                  <input
                    className="form-control"
                    value={form.p_endereco}
                    onChange={(e) =>
                      setForm({ ...form, p_endereco: e.target.value })
                    }
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Cidade</label>
                  <input
                    className="form-control"
                    value={form.p_cidade}
                    onChange={(e) => setForm({ ...form, p_cidade: e.target.value })}
                  />
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-3">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
