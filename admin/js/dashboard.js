// admin/js/dashboard.js
import { requireAuth, logout } from "./auth.js";
import { loadAdminData } from "./adminApi.js";
import { formatPrice } from "../../js/utils.js";

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

  const products = productsData.products;
  const categories = categoriesData.categories;

  const active = products.filter((p) => p.active).length;
  const variants = products.reduce((sum, product) => sum + product.variants.length, 0);
  const unavailable = products.reduce((sum, product) => sum + product.variants.filter((variant) => !variant.available).length, 0);

  document.querySelector("[data-stats]").innerHTML = `
    <div class="admin-stat-card"><div class="admin-stat-card__value">${active}</div><div class="admin-stat-card__label">Produtos ativos</div></div>
    <div class="admin-stat-card"><div class="admin-stat-card__value">${variants}</div><div class="admin-stat-card__label">Sabores cadastrados</div></div>
    <div class="admin-stat-card"><div class="admin-stat-card__value">${categories.length}</div><div class="admin-stat-card__label">Categorias</div></div>
    <div class="admin-stat-card"><div class="admin-stat-card__value">${unavailable}</div><div class="admin-stat-card__label">Sabores indisponíveis</div></div>
  `;

  const table = document.querySelector("[data-recent-products]");
  table.innerHTML = products
    .map((p) => {
      const thumb = p.variants[0]?.images?.[0];
      return `
      <div class="admin-row">
        <div class="admin-row__thumb">${thumb ? `<img src="../${thumb}" alt="" width="56" height="56" style="width:100%;height:100%;object-fit:cover" />` : ""}</div>
        <div>
          <div class="admin-row__name">${p.name}</div>
          <div class="admin-row__meta">${p.variants.length} variações · a partir de ${formatPrice(Math.min(...p.variants.map((v) => v.price)))}</div>
        </div>
        <span class="badge ${p.active ? "badge--available" : "badge--unavailable"}">${p.active ? "Ativo" : "Inativo"}</span>
        <a href="produto.html?id=${p.id}" class="btn btn--secondary btn--sm">Editar</a>
      </div>`;
    })
    .join("");
}

init();
