import { requireAuth, logout } from "./auth.js";
import { loadAdminData, saveAdminData } from "./adminApi.js";
import { generateId, slugify } from "../../js/utils.js";

function addRow(category = {}) {
  const fragment = document.querySelector("[data-category-template]").content.cloneNode(true);
  const row = fragment.querySelector(".admin-variant-row");
  row.dataset.id = category.id || generateId();
  row.querySelector('[data-field="name"]').value = category.name || "";
  row.querySelector('[data-field="order"]').value = category.order || document.querySelectorAll("[data-category-list] .admin-variant-row").length + 1;
  row.querySelector('[data-field="active"]').checked = category.active !== false;
  row.querySelector("[data-remove]").addEventListener("click", () => row.remove());
  document.querySelector("[data-category-list]").append(row);
}

async function init() {
  if (!await requireAuth()) return;
  document.querySelector("[data-current-year]").textContent = new Date().getFullYear();
  document.querySelector("[data-logout]").addEventListener("click", async () => { await logout(); location.href = "login.html"; });
  const { data } = await loadAdminData("categories");
  data.categories.forEach(addRow);
  document.querySelectorAll("[data-add-category]").forEach((button) => button.addEventListener("click", () => addRow()));
  document.querySelector("[data-category-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.target.querySelector('button[type="submit"]');
    const status = document.querySelector("[data-form-status]");
    button.disabled = true; button.textContent = "Salvando…";
    const categories = [...document.querySelectorAll("[data-category-list] .admin-variant-row")].map((row) => {
      const name = row.querySelector('[data-field="name"]').value.trim();
      return { id: row.dataset.id, slug: slugify(name), name, order: Number(row.querySelector('[data-field="order"]').value), active: row.querySelector('[data-field="active"]').checked };
    });
    const result = await saveAdminData("categories", { categories });
    status.textContent = result.ok ? "Categorias salvas com sucesso ✓" : result.error;
    button.disabled = false; button.textContent = "Salvar categorias";
  });
}
init();
