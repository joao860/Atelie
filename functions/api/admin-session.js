// functions/api/admin-session.js
// Verifica se o cookie de sessão do admin é válido (assinatura + expiração)
// e permite logout (DELETE) apagando o cookie.

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const match = header.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

async function isValidSession(session, secret) {
  if (!session) return false;
  const [issuedAt, signature] = session.split(".");
  if (!issuedAt || !signature) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const expectedBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(issuedAt));
  const expected = [...new Uint8Array(expectedBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

  const eightHoursMs = 8 * 60 * 60 * 1000;
  const notExpired = Date.now() - Number(issuedAt) < eightHoursMs;

  return signature === expected && notExpired;
}

export async function onRequestGet({ request, env }) {
  const session = getCookie(request, "atelier_admin_session");
  const configured = Boolean(env.ADMIN_PASSWORD_HASH && env.SESSION_SECRET);
  const authenticated = configured ? await isValidSession(session, env.SESSION_SECRET) : false;

  return new Response(JSON.stringify({ authenticated, configured }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestDelete() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": "atelier_admin_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0",
    },
  });
}
