import React, { useEffect, useState } from "react";
import { apiGet } from "../api";

function formatarData(data) {
  if (!data) return "-";
  return new Date(data).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function linkWhatsApp(telefone, nome, tipo) {
  const digits = String(telefone || "").replace(/\D/g, "");
  const numero = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  if (!/^55\d{10,11}$/.test(numero)) return null;

  const mensagem =
    tipo === "aniversario"
      ? `Olá, ${nome}! A equipe do CREOI deseja a você um feliz aniversário!`
      : `Olá, ${nome}! Gostaríamos de saber se deseja agendar uma consulta. Estamos à disposição.`;

  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

function ListaPacientes({ pacientes, tipo }) {
  if (pacientes.length === 0) {
    return (
      <div className="text-secondary py-3">
        {tipo === "aniversario"
          ? "Nenhum paciente faz aniversário hoje."
          : "Nenhum cadastro completa um ano hoje."}
      </div>
    );
  }

  return (
    <div className="d-grid gap-2">
      {pacientes.map((paciente) => {
        const whatsapp = linkWhatsApp(paciente.p_fone, paciente.p_nome, tipo);
        const data =
          tipo === "aniversario" ? paciente.p_nascimento : paciente.p_data;

        return (
          <div
            className="card p-3 d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2"
            key={paciente.id_paciente}
          >
            <div>
              <div className="fw-semibold">{paciente.p_nome}</div>
              <div className="text-secondary small">
                {tipo === "aniversario" ? "Nascimento" : "Data do cadastro"}:{" "}
                {formatarData(data)}
                {" · "}
                Telefone: {paciente.p_fone || "não informado"}
              </div>
            </div>
            {whatsapp ? (
              <a
                className="btn btn-outline-success btn-sm align-self-start align-self-sm-center"
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir WhatsApp
              </a>
            ) : (
              <span className="text-secondary small">WhatsApp indisponível</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Lembretes() {
  const [lembretes, setLembretes] = useState({
    cadastrosUmAno: [],
    aniversariantes: [],
  });
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  async function carregar() {
    setLoading(true);
    setErro("");
    try {
      const dados = await apiGet("/api/pacientes/lembretes");
      setLembretes(dados);
    } catch (e) {
      setErro(e?.message || "Erro ao carregar lembretes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div className="container-fluid" style={{ maxWidth: 1100 }}>
      <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
        <div>
          <h2 className="mb-0">Lembretes</h2>
          <div className="text-secondary" style={{ fontSize: 13 }}>
            Cadastros que completam um ano neste mês e aniversariantes de hoje
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

      {erro ? <div className="alert alert-danger">{erro}</div> : null}
      {loading ? <div className="text-secondary">Carregando lembretes…</div> : null}

      {!loading && !erro ? (
        <div className="d-grid gap-4">
          <section>
            <h4>
              Retorno de contato{" "}
              <span className="badge text-bg-secondary">
                {lembretes.cadastrosUmAno.length}
              </span>
            </h4>
            <p className="text-secondary small">
              Pacientes cadastrados neste mesmo mês do ano passado.
            </p>
            <ListaPacientes
              pacientes={lembretes.cadastrosUmAno}
              tipo="retorno"
            />
          </section>

          <section>
            <h4>
              Aniversariantes de hoje{" "}
              <span className="badge text-bg-secondary">
                {lembretes.aniversariantes.length}
              </span>
            </h4>
            <ListaPacientes
              pacientes={lembretes.aniversariantes}
              tipo="aniversario"
            />
          </section>
        </div>
      ) : null}
    </div>
  );
}
