/**
 * frontend/src/utils/printProntuario.js
 * Impressão A4 (compacta) - prontuário genérico + bloco opcional de oftalmologia.
 */

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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

function line(label, value) {
  return `
    <div class="line">
      <div class="k">${escapeHtml(label)}</div>
      <div class="v">${escapeHtml(value || "-")}</div>
    </div>
  `;
}

function area(label, value) {
  const safe = escapeHtml(value || "-").replaceAll("\n", "<br/>");
  return `
    <div class="area">
      <div class="k">${escapeHtml(label)}</div>
      <div class="v">${safe}</div>
    </div>
  `;
}

export function printProntuario({ clinica, logoUrl, paciente, consulta }) {
  const w = window.open("", "_blank");
  if (!w) {
    alert("O navegador bloqueou a janela de impressão. Libere pop-ups para este site.");
    return;
  }

  const dataConsulta = consulta?.c_dataConsulta
    ? toDateBR(consulta.c_dataConsulta)
    : toDateBR(new Date());

  const nascimento = paciente?.p_nascimento ? toDateBR(paciente.p_nascimento) : "-";
  const idade = paciente?.p_nascimento ? calcAge(paciente.p_nascimento) : null;

  const oftalmoHas = [
    consulta?.c_acuidadeOd,
    consulta?.c_acuidadeOe,
    consulta?.c_pressaoOcularOd,
    consulta?.c_pressaoOcularOe,
    consulta?.c_bioOd,
    consulta?.c_bioOe,
    consulta?.c_fundoOlhoOd,
    consulta?.c_fundoOlhoOe,
  ].some((x) => String(x || "").trim());

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Prontuário - ${escapeHtml(paciente?.p_nome || "")}</title>

  <style>
    @page { size: A4; margin: 12mm 12mm 12mm 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #111827;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page { padding-top: 4mm; padding-left: 4mm; padding-right: 1mm; }

    .head {
      display: grid;
      grid-template-columns: 30mm 1fr;
      gap: 7mm;
      align-items: center;
      padding-bottom: 3mm;
      margin-bottom: 4mm;
      border-bottom: 1.5px solid #0f766e;
    }

    .logo {
      width: 26mm;
      max-height: 14mm;
      object-fit: contain;
      display: block;
      margin-left: 1mm;
    }

    .h1 { font-size: 12pt; font-weight: 700; line-height: 1.1; margin: 0; }
    .sub { margin-top: 1.5mm; font-size: 8.4pt; line-height: 1.25; color: #374151; }

    .section { margin-top: 3.5mm; }
    .title { font-size: 9.8pt; font-weight: 700; color: #0f766e; margin: 0 0 2mm 0; }

    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 6mm; }

    .line {
      display: grid;
      grid-template-columns: 30mm 1fr;
      gap: 2.5mm;
      align-items: baseline;
      font-size: 9pt;
      padding: 1.4mm 0;
      border-bottom: 1px solid #e5e7eb;
    }

    .k { font-weight: 700; color: #374151; white-space: nowrap; }
    .v { color: #111827; min-height: 4mm; }

    .area { margin-top: 2mm; font-size: 9pt; }
    .area .k { display: block; margin-bottom: 1mm; font-size: 9pt; font-weight: 700; color: #374151; }
    .area .v {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 2mm 2.5mm;
      min-height: 10mm;
      line-height: 1.25;
    }

    .avoid-break { break-inside: avoid; page-break-inside: avoid; }

    .sign {
      margin-top: 6mm;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10mm;
      align-items: end;
    }

    .sign .sline { border-top: 1px solid #111827; padding-top: 1.5mm; font-size: 9pt; }

    .foot {
      margin-top: 4mm;
      padding-top: 2mm;
      border-top: 1px solid #e5e7eb;
      font-size: 8pt;
      color: #6b7280;
    }
  </style>
</head>

<body>
  <div class="page">

    <div class="head">
      <div>
        ${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="Logo" />` : ``}
      </div>

      <div>
        <h1 class="h1">${escapeHtml(clinica?.nome || "Clínica")}</h1>
        <div class="sub">
          ${escapeHtml(clinica?.endereco || "")}<br/>
          ${escapeHtml(clinica?.telefones || "")}<br/>
          ${escapeHtml(clinica?.redes || "")}
        </div>
      </div>
    </div>

    <div class="section avoid-break">
      <div class="title">Identificação do paciente</div>
      <div class="grid2">
        <div>
          ${line("Ficha", String(paciente?.id_paciente ?? "-"))}
          ${line("Nome", paciente?.p_nome)}
          ${line("CPF", paciente?.p_cpf)}
          ${line("Telefone", paciente?.p_fone)}
        </div>

        <div>
          ${line("Data", dataConsulta)}
          ${line("Nascimento", idade !== null ? `${nascimento} (${idade} anos)` : nascimento)}
          ${line("Especialidade", consulta?.c_especialidade)}
        </div>
      </div>
    </div>

    <div class="section avoid-break">
      <div class="title">Consulta (essencial)</div>
      ${area("Queixa principal", consulta?.c_queixaPessoal)}
      ${area("Diagnóstico", consulta?.c_diagnostico)}
      ${area("Conduta / Plano", consulta?.c_condutaConsulta)}
      <div class="grid2">
        <div>${area("Medicações em uso", consulta?.c_medicacoesEmUso)}</div>
        <div>${area("Alergias", consulta?.c_alergias)}</div>
      </div>
    </div>

    ${String(consulta?.c_receita || "").trim() ? `
      <div class="section avoid-break">
        <div class="title">Receita</div>
        ${area("Receita", consulta?.c_receita)}
      </div>
    ` : ``}

    ${String(consulta?.c_exameFisico || "").trim() ? `
      <div class="section avoid-break">
        <div class="title">Exame físico / Achados</div>
        ${area("Exame físico", consulta?.c_exameFisico)}
      </div>
    ` : ``}

    ${(String(consulta?.c_historicoPessoal || "").trim() || String(consulta?.c_historicoFamiliar || "").trim()) ? `
      <div class="section avoid-break">
        <div class="title">Anamnese / Antecedentes</div>
        <div class="grid2">
          <div>${area("Histórico pessoal", consulta?.c_historicoPessoal)}</div>
          <div>${area("Histórico familiar", consulta?.c_historicoFamiliar)}</div>
        </div>
      </div>
    ` : ``}

    ${oftalmoHas ? `
      <div class="section avoid-break">
        <div class="title">Exame oftalmológico (opcional)</div>
        <div class="grid2">
          <div>${line("Acuidade OD", consulta?.c_acuidadeOd)}</div>
          <div>${line("Acuidade OE", consulta?.c_acuidadeOe)}</div>

          <div>${line("Pressão OD", consulta?.c_pressaoOcularOd)}</div>
          <div>${line("Pressão OE", consulta?.c_pressaoOcularOe)}</div>

          <div>${line("BIO OD", consulta?.c_bioOd)}</div>
          <div>${line("BIO OE", consulta?.c_bioOe)}</div>

          <div>${line("Fundo OD", consulta?.c_fundoOlhoOd)}</div>
          <div>${line("Fundo OE", consulta?.c_fundoOlhoOe)}</div>
        </div>
      </div>
    ` : ``}

    ${String(consulta?.c_geral || "").trim() ? `
      <div class="section avoid-break">
        <div class="title">Observações</div>
        ${area("Observações", consulta?.c_geral)}
      </div>
    ` : ``}

    <div class="sign">
      <div class="sline">Médico</div>
      <div class="sline">CRM</div>
    </div>

    <div class="foot">
      Prontuário gerado pelo sistema CREOI
      Centro de Referência em Oftalmologia de Iguatama • ${escapeHtml(clinica?.nome || "")}
    </div>

  </div>

  <script>
    setTimeout(() => { window.print(); }, 350);
  </script>
</body>
</html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();
}
