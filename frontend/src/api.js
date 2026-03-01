// src/api.js
// Centraliza chamadas HTTP (frontend).
// Como usamos proxy do Vite, o backend fica acessível via "/api/...".

function normalizeApiPath(path) {
  // permite passar URL absoluta se um dia você precisar
  if (/^https?:\/\//i.test(path)) return path;

  // normaliza: garante que sempre vá para /api
  if (path.startsWith("/api")) return path;
  if (path.startsWith("/")) return `/api${path}`;
  return `/api/${path}`;
}

async function parseResponse(res) {
  const ct = res.headers.get("content-type") || "";

  // erro -> tenta ler JSON (se houver), senão texto
  if (!res.ok) {
    if (ct.includes("application/json")) {
      const j = await res.json().catch(() => null);
      const msg = j?.error || j?.message || JSON.stringify(j) || "Erro na requisição";
      throw new Error(msg);
    }
    const t = await res.text().catch(() => "");
    throw new Error(t || `Erro HTTP ${res.status}`);
  }

  // ok -> se não vier JSON, dá um erro amigável
  if (ct.includes("application/json")) {
    return res.json();
  }

  const t = await res.text().catch(() => "");
  throw new Error(
    `Resposta inesperada (não JSON). Você chamou o endpoint certo? Trecho: ${t
      .slice(0, 80)
      .replace(/\s+/g, " ")}`,
  );
}

export async function apiGet(path) {
  const res = await fetch(normalizeApiPath(path));
  return parseResponse(res);
}

export async function apiPost(path, body) {
  const res = await fetch(normalizeApiPath(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseResponse(res);
}

export async function apiPatch(path, body) {
  const res = await fetch(normalizeApiPath(path), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseResponse(res);
}

export async function apiPut(path, body) {
  const res = await fetch(normalizeApiPath(path), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseResponse(res);
}


async function parseBlobResponse(res) {
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    if (ct.includes("application/json")) {
      const j = await res.json().catch(() => null);
      const msg = j?.error || j?.message || JSON.stringify(j) || "Erro na requisição";
      throw new Error(msg);
    }
    const t = await res.text().catch(() => "");
    throw new Error(t || `Erro HTTP ${res.status}`);
  }
  return res.blob();
}

export async function apiGetBlob(path) {
  const res = await fetch(normalizeApiPath(path));
  return parseBlobResponse(res);
}
