// catalog.js — renderiza os cards do cardápio (home e página de cardápio)
// e controla o filtro por categoria.
import { loadStoreData, getActiveCategories, getActiveProducts } from "./api.js";
import { escapeHtml } from "./utils.js";

function priceRangeLabel(product) {
  const available = product.variants.filter((v) => v.available);
  const prices = (available.length ? available : product.variants).map((v) => v.price);
  const min = Math.min(...prices);
  const hasRange = new Set(prices).size > 1;
  const formatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(min);
  return hasRange
    ? `<small>A partir de</small><strong>${formatted}</strong>`
    : `<strong>${formatted}</strong>`;
}

function productCardHtml(product, categoryName) {
  const cover = product.variants.find((v) => v.available)?.images?.[0] ?? product.variants[0]?.images?.[0];
  const badge = product.badge;
  const allUnavailable = product.variants.every((v) => !v.available);

  return `
    <article class="product-card">
      <a href="produto.html?slug=${encodeURIComponent(product.slug)}" class="product-card__media" aria-label="Ver ${escapeHtml(product.name)}">
        ${
          cover
            ? `<img src="${cover}" alt="${escapeHtml(product.name)}" loading="lazy" width="480" height="360" />`
            : `<div class="placeholder-media" role="img" aria-label="Foto em breve"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 7h16v13H4z"/><path d="M4 7l3-4h10l3 4"/><circle cx="12" cy="14" r="3.2"/></svg></div>`
        }
      </a>
      <div class="product-card__body">
        ${badge ? `<span class="product-card__badge">${escapeHtml(badge)}</span>` : ""}
        <h3 class="product-card__name">${escapeHtml(product.name)}</h3>
        <p class="product-card__desc">${escapeHtml(product.shortDescription)}</p>
        <div class="product-card__footer">
          <span class="product-card__price">${allUnavailable ? '<span class="badge badge--unavailable">Indisponível</span>' : priceRangeLabel(product)}</span>
          <a href="produto.html?slug=${encodeURIComponent(product.slug)}" class="btn btn--ghost">Ver detalhes →</a>
        </div>
      </div>
    </article>
  `;
}

/**
 * Renderiza uma grade de produtos dentro de `container`.
 * Se `limit` for informado, mostra apenas os N primeiros (uso na home).
 */
export async function renderProductGrid(container, { limit, categoryId } = {}) {
  if (!container) return;
  container.innerHTML = `
    <div class="skeleton" style="height:320px"></div>
    <div class="skeleton" style="height:320px"></div>
    <div class="skeleton" style="height:320px"></div>
  `;

  try {
    const store = await loadStoreData();
    let products = getActiveProducts(store);

    if (categoryId && categoryId !== "todos") {
      products = products.filter((p) => p.category === categoryId);
    }
    if (limit) products = products.slice(0, limit);

    if (!products.length) {
      container.innerHTML = `
        <div class="state-block">
          <h2>Nenhum doce por aqui ainda</h2>
          <p>Estamos preparando novidades. Volte em breve ♡</p>
        </div>
      `;
      return;
    }

    const categoryMap = Object.fromEntries(store.categories.map((c) => [c.id, c.name]));
    container.innerHTML = products.map((p) => productCardHtml(p, categoryMap[p.category])).join("");
  } catch (err) {
    console.error(err);
    container.innerHTML = `
      <div class="state-block">
        <h2>Não foi possível carregar o cardápio</h2>
        <p>Verifique sua conexão e tente novamente.</p>
        <button class="btn btn--secondary" onclick="location.reload()">Tentar novamente</button>
      </div>
    `;
  }
}

/**
 * Inicializa o filtro de categorias (usado na página de cardápio completo).
 */
export async function initCategoryFilter(filterEl, gridEl) {
  if (!filterEl || !gridEl) return;
  const store = await loadStoreData();
  const categories = getActiveCategories(store);

  const buttons = [
    { id: "todos", name: "Todos" },
    ...categories.map((c) => ({ id: c.id, name: c.name })),
  ];

  filterEl.innerHTML = buttons
    .map(
      (c, i) => `<button type="button" data-category="${c.id}" aria-pressed="${i === 0}">${escapeHtml(c.name)}</button>`
    )
    .join("");

  filterEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-category]");
    if (!btn) return;
    filterEl.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", "false"));
    btn.setAttribute("aria-pressed", "true");
    renderProductGrid(gridEl, { categoryId: btn.dataset.category });
  });

  await renderProductGrid(gridEl, { categoryId: "todos" });
}
