// api.js — busca os dados públicos (produtos, categorias, configurações).
// Hoje lê arquivos JSON estáticos em /data. Se no futuro os dados passarem
// a vir de uma API real, apenas este arquivo precisa mudar.

let cache = null;

function resolveDataPath(file) {
  // Permite que a página funcione tanto em / quanto em /admin/*
  const inAdmin = window.location.pathname.includes("/admin/");
  return inAdmin ? `../data/${file}` : `data/${file}`;
}

async function fetchJson(file) {
  const res = await fetch(resolveDataPath(file), { cache: "no-store" });
  if (!res.ok) throw new Error(`Falha ao carregar ${file}`);
  return res.json();
}

/**
 * Carrega todos os dados públicos de uma vez, com cache em memória
 * durante a sessão de navegação (evita refetch entre páginas do SPA-like flow).
 */
export async function loadStoreData({ forceRefresh = false } = {}) {
  if (cache && !forceRefresh) return cache;

  const [productsData, categoriesData, settings] = await Promise.all([
    fetchJson("products.json"),
    fetchJson("categories.json"),
    fetchJson("settings.json"),
  ]);

  cache = {
    products: productsData.products ?? [],
    categories: categoriesData.categories ?? [],
    settings,
  };

  return cache;
}

export function getProductBySlug(storeData, slug) {
  return storeData.products.find((p) => p.slug === slug) ?? null;
}

export function getVariant(product, variantId) {
  if (!product) return null;
  return product.variants.find((v) => v.id === variantId) ?? null;
}

export function getActiveCategories(storeData) {
  return [...storeData.categories]
    .filter((c) => c.active)
    .sort((a, b) => a.order - b.order);
}

export function getActiveProducts(storeData) {
  return [...storeData.products]
    .filter((p) => p.active)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
