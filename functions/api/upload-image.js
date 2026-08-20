const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const MAX_BYTES = 5 * 1024 * 1024;

function getCookie(request, name) {
  const match = (request.headers.get("Cookie") || "").match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

async function isValidSession(session, secret) {
  if (!session || !secret) return false;
  const [issuedAt, signature] = session.split(".");
  if (!issuedAt || !signature || Date.now() - Number(issuedAt) >= 8 * 60 * 60 * 1000) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(issuedAt));
  const expected = [...new Uint8Array(signed)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return signature === expected;
}

function safeName(name) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\.[^.]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "produto";
}

function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export async function onRequestPost({ request, env }) {
  const authenticated = await isValidSession(getCookie(request, "atelier_admin_session"), env.SESSION_SECRET);
  if (!authenticated) return Response.json({ error: "Não autenticado." }, { status: 401 });
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO || !env.GITHUB_BRANCH) {
    return Response.json({ error: "Integração com GitHub não configurada." }, { status: 501 });
  }

  const form = await request.formData().catch(() => null);
  const image = form?.get("image");
  if (!image || typeof image.arrayBuffer !== "function") return Response.json({ error: "Selecione uma imagem." }, { status: 400 });
  const extension = ALLOWED_TYPES.get(image.type);
  if (!extension) return Response.json({ error: "Formato inválido. Use JPEG, PNG ou WebP." }, { status: 415 });
  if (image.size > MAX_BYTES) return Response.json({ error: "A imagem deve ter no máximo 5 MB." }, { status: 413 });

  const fileName = `${Date.now()}-${safeName(image.name)}.${extension}`;
  const path = `assets/products/${fileName}`;
  const apiUrl = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`;
  const result = await fetch(apiUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, "User-Agent": "atelier-da-duda-admin", Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: JSON.stringify({ message: `admin: adicionar foto ${fileName}`, content: bytesToBase64(new Uint8Array(await image.arrayBuffer())), branch: env.GITHUB_BRANCH }),
  });
  if (!result.ok) {
    const details = await result.json().catch(() => ({}));
    return Response.json({ error: details.message || "Falha ao salvar a imagem no GitHub." }, { status: result.status === 409 ? 409 : 502 });
  }
  return Response.json({ ok: true, path });
}
