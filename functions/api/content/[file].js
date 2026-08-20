// functions/api/content/[file].js
//
// Permite que o admin salve alterações em data/products.json,
// data/categories.json e data/settings.json diretamente no repositório
// do GitHub, disparando um novo deploy automático no Cloudflare Pages.
//
// Fluxo: Admin (browser) -> esta Function (protegida por sessão) -> GitHub API -> commit no repo.
//
// Variáveis de ambiente necessárias (Cloudflare Pages > Settings > Environment variables):
//   GITHUB_TOKEN   -> token do GitHub (fine-grained, permissão "Contents: Read and write"
//                      apenas no repositório do site). NUNCA colocar no navegador.
//   GITHUB_REPO    -> "usuario/repositorio"
//   GITHUB_BRANCH  -> ex. "main"
//   SESSION_SECRET -> mesma variável usada em admin-login.js / admin-session.js
//
// Se essas variáveis não estiverem configuradas, o endpoint responde 501
// e o admin deve seguir salvando localmente (ver admin/js/adminApi.js).

const ALLOWED_FILES = new Set(["products.json", "categories.json", "settings.json"]);

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
  return signature === expected && Date.now() - Number(issuedAt) < eightHoursMs;
}

function toBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

export async function onRequestPut({ request, env, params }) {
  const fileName = `${params.file}.json`;
  if (!ALLOWED_FILES.has(fileName)) {
    return new Response(JSON.stringify({ error: "Arquivo não permitido." }), { status: 400 });
  }

  const session = getCookie(request, "atelier_admin_session");
  const authenticated = env.SESSION_SECRET ? await isValidSession(session, env.SESSION_SECRET) : false;
  if (!authenticated) {
    return new Response(JSON.stringify({ error: "Não autenticado." }), { status: 401 });
  }

  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO || !env.GITHUB_BRANCH) {
    return new Response(
      JSON.stringify({
        error:
          "Persistência via GitHub não configurada. Defina GITHUB_TOKEN, GITHUB_REPO e GITHUB_BRANCH nas variáveis de ambiente.",
      }),
      { status: 501, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return new Response(JSON.stringify({ error: "JSON inválido." }), { status: 400 });
  }

  const apiUrl = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/data/${fileName}`;
  const ghHeaders = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    "User-Agent": "atelier-da-duda-admin",
    Accept: "application/vnd.github+json",
  };

  // 1. Busca o sha atual do arquivo (necessário para atualizar via API do GitHub)
  const currentRes = await fetch(`${apiUrl}?ref=${env.GITHUB_BRANCH}`, { headers: ghHeaders });
  if (!currentRes.ok && currentRes.status !== 404) {
    return new Response(JSON.stringify({ error: "Falha ao consultar o arquivo atual no GitHub." }), { status: 502 });
  }
  const current = currentRes.ok ? await currentRes.json() : null;

  // 2. Faz o commit com o novo conteúdo
  const commitRes = await fetch(apiUrl, {
    method: "PUT",
    headers: { ...ghHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `admin: atualizar ${fileName}`,
      content: toBase64(JSON.stringify(body, null, 2)),
      branch: env.GITHUB_BRANCH,
      sha: current?.sha,
    }),
  });

  if (!commitRes.ok) {
    const errBody = await commitRes.json().catch(() => ({}));
    const conflict = commitRes.status === 409 || commitRes.status === 422;
    return new Response(JSON.stringify({
      error: conflict
        ? "O conteúdo foi alterado por outra pessoa. Recarregue a página e tente novamente."
        : "Falha ao salvar no GitHub.",
      details: errBody.message,
    }), { status: conflict ? 409 : 502, headers: { "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
