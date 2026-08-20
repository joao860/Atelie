// functions/api/admin-login.js
//
// Cloudflare Pages Function responsável pelo login do admin.
// Nunca guarda a senha no frontend: ela é comparada aqui, no servidor,
// contra a variável de ambiente ADMIN_PASSWORD_HASH (hash SHA-256 em hex).
//
// Configuração necessária (Cloudflare Pages > Settings > Environment variables):
//   ADMIN_PASSWORD_HASH  -> hash SHA-256 (hex) da senha do admin
//   SESSION_SECRET       -> string aleatória longa, usada para assinar a sessão
//
// Para gerar o hash da senha localmente:
//   node -e "crypto.subtle.digest('SHA-256', new TextEncoder().encode('SUASENHA')).then(b=>console.log(Buffer.from(b).toString('hex')))"

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function signSession(secret) {
  // Token de sessão simples: timestamp + assinatura HMAC.
  const issuedAt = Date.now().toString();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(issuedAt));
  const signature = [...new Uint8Array(signatureBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${issuedAt}.${signature}`;
}

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD_HASH || !env.SESSION_SECRET) {
    return new Response(
      JSON.stringify({
        error:
          "Login não configurado. Defina ADMIN_PASSWORD_HASH e SESSION_SECRET nas variáveis de ambiente do Cloudflare Pages.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const { password } = await request.json().catch(() => ({}));
  if (!password) {
    return new Response(JSON.stringify({ error: "Informe a senha." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const hash = await sha256Hex(password);
  if (hash !== env.ADMIN_PASSWORD_HASH) {
    return new Response(JSON.stringify({ error: "Senha incorreta." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const session = await signSession(env.SESSION_SECRET);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `atelier_admin_session=${session}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`,
    },
  });
}
