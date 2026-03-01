// src/pages/Medico.jsx
// Tela do médico: mostra fila do dia e abre prontuário ao chamar.
import React, { useEffect, useState } from "react";
import { apiGet, apiPatch } from "../api";
import ProntuarioModal from "../components/ProntuarioModal";

export default function Medico() {
  const [fila, setFila] = useState([]);
  const [prontuarioAberto, setProntuarioAberto] = useState(false);
  const [filaSelecionada, setFilaSelecionada] = useState(null);

  async function carregar() {
    const data = await apiGet("/api/fila");
    setFila(data);
  }

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 3000);
    return () => clearInterval(t);
  }, []);

  async function chamarEabrir(filaItem) {
    try {
      // 1) marca como CHAMADO (isso mantém no topo como "em atendimento")
      await apiPatch(`/api/fila/${filaItem.id_fila}`, { acao: "chamar" });

      // 2) abre prontuário
      setFilaSelecionada(filaItem);
      setProntuarioAberto(true);

      // 3) atualiza lista
      await carregar();
    } catch (e) {
      console.error(e);
      alert("Erro ao chamar paciente.");
    }
  }

  function fecharProntuario(recarregar) {
    setProntuarioAberto(false);
    setFilaSelecionada(null);
    if (recarregar) carregar();
  }

  const ativos = fila.filter((f) => ["NA_FILA", "CHAMADO"].includes(f.status));

  function formatHora(dt) {
    try {
      return new Date(dt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "-";
    }
  }

  return (
    <div className="container-fluid">
      <h2>Fila de Atendimento Médico</h2>
      <div className="text-secondary mb-3">Fila do dia</div>

      <div className="card p-3">
        {ativos.length === 0 ? (
          <div className="text-secondary">Nenhum paciente na fila.</div>
        ) : (
          <>
            {/* ====== MOBILE: cards (pra não “sumir” o botão Chamar) ====== */}
            <div className="d-md-none d-flex flex-column gap-2">
              {ativos.map((f, idx) => (
                <div key={f.id_fila} className="card p-2">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div style={{ minWidth: 0 }}>
                      <div className="fw-bold" style={{ fontSize: 16 }}>
                        #{idx + 1} — {f.paciente?.p_nome || "(sem nome)"}
                      </div>
                      <div className="text-secondary" style={{ fontSize: 12 }}>
                        Chegada: {formatHora(f.chegada_em)}
                      </div>
                    </div>

                    <span className={`badge ${f.status === "CHAMADO" ? "bg-warning text-dark" : "bg-primary"}`}>
                      {f.status}
                    </span>
                  </div>

                  <button
                    className="btn btn-success btn-sm mt-2 w-100"
                    onClick={() => chamarEabrir(f)}
                  >
                    Chamar paciente
                  </button>
                </div>
              ))}
            </div>

            {/* ====== DESKTOP: tabela ====== */}
            <div className="d-none d-md-block table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Posição</th>
                    <th>Chegada</th>
                    <th>Paciente</th>
                    <th>Status</th>
                    <th className="text-end">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {ativos.map((f, idx) => (
                    <tr key={f.id_fila}>
                      <td className="fw-bold">#{idx + 1}</td>
                      <td>{formatHora(f.chegada_em)}</td>
                      <td className="fw-semibold">{f.paciente?.p_nome}</td>
                      <td>
                        <span className="badge bg-primary">{f.status}</span>
                      </td>
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => chamarEabrir(f)}
                        >
                          Chamar paciente
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <ProntuarioModal
        aberto={prontuarioAberto}
        onFechar={fecharProntuario}
        filaItem={filaSelecionada}
      />
    </div>
  );
}
