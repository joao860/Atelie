// admin/js/adminApi.js
// Lê e grava products.json / categories.json / settings.json.
// Escrita real acontece via Cloudflare Function -> GitHub API (produção).
// Toda escrita exige sessão real e integração GitHub configurada no servidor.
const FILES = { products: "products.json", categories: "categories.json", settings: "settings.json" };

/**
 * Carrega os dados: usa o rascunho local se existir (para refletir
 * imediatamente o que o admin editou), senão busca o JSON publicado.
 */
export async function loadAdminData(key) {
  const file = FILES[key];
  const res = await fetch(`../data/${file}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Não foi possível carregar ${file}`);
  return { data: await res.json() };
}

/**
 * Salva os dados. Tenta publicar via GitHub (Cloudflare Function);
 * se a integração não estiver configurada, grava como rascunho local
 * e retorna essa informação para a UI avisar o admin.
 */
export async function saveAdminData(key, data) {
  const file = FILES[key];

  try {
    const res = await fetch(`/api/content/${key}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      return { ok: true, published: true };
    }

    const errBody = await res.json().catch(() => ({}));
    return { ok: false, error: errBody.error || "Falha ao salvar." };
  } catch {
    return { ok: false, error: "Não foi possível contatar a API administrativa." };
  }
}

export async function uploadProductImage(file) {
  const body = new FormData();
  body.append("image", file);
  const res = await fetch("/api/upload-image", { method: "POST", credentials: "include", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Falha ao enviar a imagem.");
  return data;
}
