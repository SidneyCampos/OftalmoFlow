// frontend/src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { apiGet } from "../api";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  async function carregar() {
    setLoading(true);
    setErr("");
    try {
      // Importante: com o proxy do Vite, use /api/...
      const json = await apiGet("/api/dashboard/summary");
      setData(json);
    } catch (e) {
      setErr(e?.message || "Erro ao carregar dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  // helper: render seguro (nunca renderiza objeto puro)
  function renderValor(v) {
    if (v === null || v === undefined) return "-";
    if (typeof v === "string" || typeof v === "number") return v;
    if (typeof v === "boolean") return v ? "Sim" : "Não";
    // objeto/array vira JSON (evita crash)
    return JSON.stringify(v);
  }

  return (
    <div className="container-fluid" style={{ maxWidth: 1100 }}>
      <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
        <div>
          <h2 className="mb-0">Dashboard</h2>
          <div className="text-secondary" style={{ fontSize: 13 }}>
            Visão rápida para administração
          </div>
        </div>

        <button
          className="btn btn-outline-primary"
          onClick={carregar}
          disabled={loading}
        >
          Atualizar
        </button>
      </div>

      {err ? <div className="alert alert-danger">{err}</div> : null}

      {loading ? <div className="text-secondary">Carregando…</div> : null}

      {!loading && data ? (
        <div className="d-grid gap-3">
          {/* Cards principais */}
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <div className="card p-3 h-100">
                <div className="text-secondary" style={{ fontSize: 12 }}>
                  Pacientes cadastrados
                </div>
                <div className="fw-bold" style={{ fontSize: 28 }}>
                  {renderValor(data?.pacientes?.total)}
                </div>
                <div className="text-secondary" style={{ fontSize: 12 }}>
                  Semana: {renderValor(data?.pacientes?.cadastradosSemana)} •
                  Mês: {renderValor(data?.pacientes?.cadastradosMes)} • Ano:{" "}
                  {renderValor(data?.pacientes?.cadastradosAno)}
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="card p-3 h-100">
                <div className="text-secondary" style={{ fontSize: 12 }}>
                  Atendimentos
                </div>
                <div className="fw-bold" style={{ fontSize: 28 }}>
                  {renderValor(data?.atendimentos?.total)}
                </div>
                <div className="text-secondary" style={{ fontSize: 12 }}>
                  Hoje: {renderValor(data?.atendimentos?.hoje)} • Semana:{" "}
                  {renderValor(data?.atendimentos?.semana)} • Mês:{" "}
                  {renderValor(data?.atendimentos?.mes)} • Ano:{" "}
                  {renderValor(data?.atendimentos?.ano)}
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="card p-3 h-100">
                <div className="text-secondary" style={{ fontSize: 12 }}>
                  Fila de hoje
                </div>
                <div className="fw-bold" style={{ fontSize: 28 }}>
                  {renderValor(data?.fila?.hoje)}
                </div>
                <div className="text-secondary" style={{ fontSize: 12 }}>
                  (Total de registros na fila do dia)
                </div>
              </div>
            </div>
          </div>

          {/* Por status - aqui é onde geralmente quebrava */}
          <div className="card p-3">
            <div className="fw-bold mb-2">Fila hoje (por status)</div>

            {data?.fila?.hojePorStatus &&
            typeof data.fila.hojePorStatus === "object" ? (
              <div className="d-grid gap-1" style={{ maxWidth: 420 }}>
                {Object.entries(data.fila.hojePorStatus).map(
                  ([status, qtd]) => (
                    <div
                      key={status}
                      className="d-flex justify-content-between border-bottom py-1"
                    >
                      <span>{status}</span>
                      <span className="fw-bold">{qtd}</span>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="text-secondary" style={{ fontSize: 13 }}>
                Sem dados por status.
              </div>
            )}
          </div>

          {/* Insights */}
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <div className="card p-3 h-100">
                <div className="fw-bold mb-2">Top cidades (cadastros)</div>
                {Array.isArray(data?.insights?.topCidades) &&
                data.insights.topCidades.length ? (
                  <div className="d-grid gap-1">
                    {data.insights.topCidades.map((c) => (
                      <div
                        key={c.cidade}
                        className="d-flex justify-content-between border-bottom py-1"
                      >
                        <span>{c.cidade}</span>
                        <span className="fw-bold">{c.qtd}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-secondary" style={{ fontSize: 13 }}>
                    Sem cidades suficientes ainda.
                  </div>
                )}
              </div>
            </div>

            <div className="col-12 col-md-6">
              <div className="card p-3 h-100">
                <div className="fw-bold mb-2">Últimos 7 dias</div>
                {Array.isArray(data?.atendimentos?.ultimos7dias) &&
                data.atendimentos.ultimos7dias.length ? (
                  <div className="d-grid gap-1">
                    {data.atendimentos.ultimos7dias.map((d) => (
                      <div
                        key={d.data}
                        className="d-flex justify-content-between border-bottom py-1"
                      >
                        <span>{d.data}</span>
                        <span className="fw-bold">{d.qtd}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-secondary" style={{ fontSize: 13 }}>
                    Sem dados suficientes.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Debug opcional (se quiser ver o JSON sem quebrar) */}
          {/* <pre style={{ fontSize: 11, background: "#f7f7f7", padding: 12, borderRadius: 8 }}>
            {JSON.stringify(data, null, 2)}
          </pre> */}
        </div>
      ) : null}
    </div>
  );
}
