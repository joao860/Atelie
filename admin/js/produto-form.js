// admin/js/produto-form.js
import { requireAuth, logout } from "./auth.js";
import { loadAdminData, saveAdminData, uploadProductImage } from "./adminApi.js";
import { slugify, generateId, getQueryParam } from "../../js/utils.js";

let productsData = null;
let categoriesData = null;
let editingId = null;

function updatePreview() {
  const form = document.querySelector("[data-product-form]");
  const firstVariant = document.querySelector(".admin-variant-row");
  const name = form?.name?.value.trim() || "Nome do produto";
  const badge = form?.badge?.value.trim();
  const price = Number(firstVariant?.querySelector('[data-field="price"]')?.value || 0);
  const image = firstVariant?.querySelector("[data-preview-image]")?.src;
  document.querySelector("[data-product-preview-name]").textContent = name;
  document.querySelector("[data-product-preview-price]").textContent = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);
  const badgeEl = document.querySelector("[data-product-preview-badge]");
  badgeEl.textContent = badge || "";
  badgeEl.hidden = !badge;
  if (image) document.querySelector("[data-product-preview-image]").src = image;
}

function addVariantRow(variant = {}) {
  const template = document.querySelector("[data-variant-template]");
  const clone = template.content.cloneNode(true);
  const row = clone.querySelector(".admin-variant-row");

  row.dataset.variantId = variant.id || generateId();
  row.querySelector('[data-field="name"]').value = variant.name || "";
  row.querySelector('[data-field="price"]').value = variant.price ?? "";
  row.querySelector('[data-field="available"]').checked = variant.available !== false;
  row.querySelector('[data-field="description"]').value = variant.description || "";
  row.querySelector('[data-field="images"]').value = (variant.images || []).join(", ");
  row.querySelector('[data-field="badge"]').value = variant.badge || "";

  const fileInput = row.querySelector('[data-field="image-file"]');
  const preview = row.querySelector("[data-image-preview]");
  const previewImage = row.querySelector("[data-preview-image]");
  const previewName = row.querySelector("[data-preview-name]");
  const existingImage = variant.images?.[0];
  if (existingImage) {
    previewImage.src = `../${existingImage}`;
    previewName.textContent = existingImage.split("/").pop();
    preview.hidden = false;
    updatePreview();
  }
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    const status = row.querySelector("[data-upload-status]");
    status.textContent = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      status.textContent = "Use uma imagem JPEG, PNG ou WebP.";
      fileInput.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      status.textContent = "A imagem deve ter no máximo 5 MB.";
      fileInput.value = "";
      return;
    }
    previewImage.src = URL.createObjectURL(file);
    previewName.textContent = file.name;
    preview.hidden = false;
    updatePreview();
  });
  row.querySelector("[data-remove-image]").addEventListener("click", () => {
    fileInput.value = "";
    row.querySelector('[data-field="images"]').value = "";
    preview.hidden = true;
    updatePreview();
  });

  row.querySelector("[data-remove-variant]").addEventListener("click", () => { row.remove(); updatePreview(); });

  document.querySelector("[data-variants]").appendChild(row);
  row.addEventListener("input", updatePreview);
  updatePreview();
}

function readVariantsFromForm() {
  return [...document.querySelectorAll(".admin-variant-row")].map((row, index) => ({
    id: row.dataset.variantId,
    slug: slugify(row.querySelector('[data-field="name"]').value),
    name: row.querySelector('[data-field="name"]').value.trim(),
    description: row.querySelector('[data-field="description"]').value.trim(),
    price: Number(row.querySelector('[data-field="price"]').value || 0),
    available: row.querySelector('[data-field="available"]').checked,
    badge: row.querySelector('[data-field="badge"]').value.trim() || null,
    order: index + 1,
    images: row
      .querySelector('[data-field="images"]')
      .value.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  }));
}

function fillForm(product) {
  const form = document.querySelector("[data-product-form]");
  form.name.value = product.name;
  form.slug.value = product.slug;
  form.category.value = product.category;
  form.shortDescription.value = product.shortDescription;
  form.description.value = product.description;
  form.active.checked = product.active;
  form.featured.checked = product.featured;
  form.badge.value = product.badge || "";
  form.order.value = product.order ?? 1;
  form.seoTitle.value = product.seoTitle || "";
  form.seoDescription.value = product.seoDescription || "";

  product.variants.forEach((v) => addVariantRow(v));
}

async function handleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const statusEl = document.querySelector("[data-form-status]");
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "Salvando…";

  const rows = [...document.querySelectorAll(".admin-variant-row")];
  try {
    for (const row of rows) {
      const file = row.querySelector('[data-field="image-file"]').files[0];
      if (!file) continue;
      const status = row.querySelector("[data-upload-status]");
      status.textContent = "Enviando foto…";
      const uploaded = await uploadProductImage(file);
      row.querySelector('[data-field="images"]').value = uploaded.path;
      status.textContent = "Foto enviada com sucesso.";
    }
  } catch (error) {
    statusEl.textContent = error.message;
    submitBtn.disabled = false;
    submitBtn.textContent = "Salvar produto";
    return;
  }

  const variants = readVariantsFromForm();

  if (!variants.length) {
    statusEl.textContent = "Adicione ao menos uma variação (sabor).";
    submitBtn.disabled = false;
    submitBtn.textContent = "Salvar produto";
    return;
  }

  const product = {
    id: editingId || slugify(form.name.value) || generateId(),
    slug: form.slug.value.trim() || slugify(form.name.value),
    name: form.name.value.trim(),
    category: form.category.value,
    shortDescription: form.shortDescription.value.trim(),
    description: form.description.value.trim(),
    active: form.active.checked,
    featured: form.featured.checked,
    badge: form.badge.value.trim() || null,
    order: Number(form.order.value || 1),
    seoTitle: form.seoTitle.value.trim(),
    seoDescription: form.seoDescription.value.trim(),
    variants,
  };

  const existingIndex = productsData.products.findIndex((p) => p.id === product.id);
  if (existingIndex >= 0) {
    productsData.products[existingIndex] = product;
  } else {
    productsData.products.push(product);
  }

  statusEl.textContent = "Salvando…";
  const result = await saveAdminData("products", productsData);

  if (!result.ok) {
    statusEl.textContent = result.error || "Erro ao salvar.";
    submitBtn.disabled = false;
    submitBtn.textContent = "Salvar produto";
    return;
  }

  statusEl.textContent = "Produto salvo com sucesso ✓";

  setTimeout(() => { window.location.href = "produtos.html"; }, 1200);
}

async function init() {
  const auth = await requireAuth();
  if (!auth) return;

  document.querySelector("[data-current-year]").textContent = new Date().getFullYear();
  document.querySelector("[data-logout]").addEventListener("click", async () => {
    await logout();
    window.location.href = "login.html";
  });

  const [{ data: pData }, { data: cData }] = await Promise.all([
    loadAdminData("products"),
    loadAdminData("categories"),
  ]);
  productsData = pData;
  categoriesData = cData;

  const categorySelect = document.querySelector("[data-category-select]");
  categorySelect.innerHTML = categoriesData.categories
    .map((c) => `<option value="${c.id}">${c.name}</option>`)
    .join("");

  editingId = getQueryParam("id");
  if (editingId) {
    const product = productsData.products.find((p) => p.id === editingId);
    if (product) {
      document.querySelector("[data-form-title]").textContent = `Editar: ${product.name}`;
      fillForm(product);
    }
  }

  document.querySelector("[data-add-variant]").addEventListener("click", () => addVariantRow());
  document.querySelector("[data-product-form]").addEventListener("submit", handleSubmit);
  document.querySelector("[data-product-form]").addEventListener("input", updatePreview);

  document.getElementById("name").addEventListener("blur", (e) => {
    const slugField = document.getElementById("slug");
    if (!slugField.value) slugField.value = slugify(e.target.value);
  });
  updatePreview();
}

init();
