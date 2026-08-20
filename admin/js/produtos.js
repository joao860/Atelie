// admin/js/produtos.js
import { requireAuth, logout } from "./auth.js";
import { loadAdminData } from "./adminApi.js";
import { formatPrice, debounce, escapeHtml } from "../../js/utils.js";

let allProducts = [];
let categories = [];

function renderList() {
  const search = document.querySelector("[data-search]").value.trim().toLowerCase();
  const category = document.querySelector("[data-filter-category]").value;
  const status = document.querySelector("[data-filter-status]").value;

  let filtered = allProducts;
  if (search) filtered = filtered.filter((p) => p.name.toLowerCase().includes(search));
  if (category !== "todos") filtered = filtered.filter((p) => p.category === category);
  if (status === "ativo") filtered = filtered.filter((p) => p.active);
  if (status === "inativo") filtered = filtered.filter((p) => !p.active);

  const list = document.querySelector("[data-product-list]");

  if (!filtered.length) {
    list.innerHTML = `<div class="state-block"><h2>Nenhum produto encontrado</h2><p>Ajuste a busca ou os filtros.</p></div>`;
    return;
  }

  list.innerHTML = filtered
    .map((p) => {
      const thumb = p.variants[0]?.images?.[0];
      const minPrice = Math.min(...p.variants.map((v) => v.price));
      return `
      <div class="admin-row">
        <div class="admin-row__thumb">${thumb ? `<img src="../${thumb}" alt="" width="56" height="56" style="width:100%;height:100%;object-fit:cover" />` : ""}</div>
        <div>
          <div class="admin-row__name">${escapeHtml(p.name)}</div>
          <div class="admin-row__meta">${p.variants.length} variações · a partir de ${formatPrice(minPrice)}${p.featured ? " · Destaque" : ""}</div>
        </div>
        <span class="badge ${p.active ? "badge--available" : "badge--unavailable"}">${p.active ? "Ativo" : "Inativo"}</span>
        <span></span>
        <a href="produto.html?id=${p.id}" class="btn btn--secondary btn--sm">Editar</a>
      </div>`;
    })
    .join("");
}

async function init() {
  const auth = await requireAuth();
  if (!auth) return;

  document.querySelector("[data-current-year]").textContent = new Date().getFullYear();
  document.querySelector("[data-logout]").addEventListener("click", async () => {
    await logout();
    window.location.href = "login.html";
  });

  const [{ data: productsData }, { data: categoriesData }] = await Promise.all([
    loadAdminData("products"),
    loadAdminData("categories"),
  ]);
  allProducts = productsData.products;
  categories = categoriesData.categories;

  const categorySelect = document.querySelector("[data-filter-category]");
  categorySelect.innerHTML =
    `<option value="todos">Todas as categorias</option>` +
    categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");

  document.querySelector("[data-search]").addEventListener("input", debounce(renderList, 200));
  categorySelect.addEventListener("change", renderList);
  document.querySelector("[data-filter-status]").addEventListener("change", renderList);

  renderList();
}

init();
