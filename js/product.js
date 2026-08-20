// product.js — página de detalhe de produto: galeria, seleção de sabor,
// quantidade e adicionar ao pedido.
import { loadStoreData, getProductBySlug } from "./api.js";
import { addItem } from "./cart.js";
import { formatPrice, getQueryParam, escapeHtml, setHidden } from "./utils.js";
import { showToast } from "./toast.js";

let currentProduct = null;
let currentVariant = null;
let quantity = 1;
let storeSettings = null;

const els = {};

function cacheEls() {
  els.loading = document.querySelector("[data-product-loading]");
  els.content = document.querySelector("[data-product-content]");
  els.notFound = document.querySelector("[data-product-not-found]");
  els.breadcrumbName = document.querySelector("[data-breadcrumb-product]");
  els.eyebrow = document.querySelector("[data-product-category]");
  els.name = document.querySelector("[data-product-name]");
  els.desc = document.querySelector("[data-product-desc]");
  els.variantDesc = document.querySelector("[data-variant-desc]");
  els.variantError = document.querySelector("[data-variant-error]");
  els.selectedVariant = document.querySelector("[data-selected-variant]");
  els.selectedVariantName = document.querySelector("[data-selected-variant-name]");
  els.selectedVariantBadge = document.querySelector("[data-selected-variant-badge]");
  els.buyControls = document.querySelector("[data-buy-controls]");
  els.unitPrice = document.querySelector("[data-unit-price]");
  els.variantList = document.querySelector("[data-variant-list]");
  els.galleryTrack = document.querySelector("[data-gallery-track]");
  els.galleryDots = document.querySelector("[data-gallery-dots]");
  els.qtyOutput = document.querySelector("[data-qty-output]");
  els.qtyMinus = document.querySelector("[data-qty-minus]");
  els.qtyPlus = document.querySelector("[data-qty-plus]");
  els.priceValue = document.querySelector("[data-price-value]");
  els.priceUnit = document.querySelector("[data-price-unit]");
  els.addBtn = document.querySelector("[data-add-to-cart]");
  els.unavailableNote = document.querySelector("[data-unavailable-note]");
  els.availabilityNote = document.querySelector("[data-availability-note]");
  els.stickyBar = document.querySelector("[data-product-sticky-bar]");
  els.stickyPrice = document.querySelector("[data-sticky-price]");
  els.stickyAddBtn = document.querySelector("[data-sticky-add]");
  els.pausedNote = document.querySelector("[data-store-paused-inline]");
}

function renderGallery(images) {
  const list = images?.length
    ? images
    : []; // sem imagens ainda → placeholder

  if (!list.length) {
    els.galleryTrack.innerHTML = `
      <div class="placeholder-media" role="img" aria-label="Foto em breve">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 7h16v13H4z"/><path d="M4 7l3-4h10l3 4"/><circle cx="12" cy="14" r="3.2"/></svg>
      </div>`;
    els.galleryDots.innerHTML = "";
    return;
  }

  els.galleryTrack.innerHTML = list
    .map((src, i) => `<img src="${src}" alt="${escapeHtml(currentProduct.name)}${currentVariant ? ` — ${escapeHtml(currentVariant.name)}` : ""}" loading="${i === 0 ? "eager" : "lazy"}" width="600" height="750" />`)
    .join("");

  els.galleryDots.innerHTML = list
    .map((_, i) => `<button type="button" aria-current="${i === 0}" aria-label="Ver imagem ${i + 1}" data-dot="${i}"></button>`)
    .join("");
}

function renderVariantList() {
  els.variantList.innerHTML = currentProduct.variants
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(
      (v) => `
      <button
        type="button"
        class="variant-chip"
        data-variant-id="${v.id}"
        data-available="${v.available}"
        aria-pressed="${v.id === currentVariant?.id}"
        ${v.available ? "" : "disabled"}
      >
        <span class="variant-chip__info">
          <span class="variant-chip__name">${escapeHtml(v.name)}</span>
          <span class="variant-chip__desc">${v.available ? escapeHtml(v.description) : "Indisponível no momento"}</span>
        </span>
        <span class="variant-chip__meta">
          <span class="variant-chip__price">${formatPrice(v.price)}</span>
          <span class="variant-chip__check" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          </span>
        </span>
      </button>
    `
    )
    .join("");
}

function updatePriceDisplay() {
  if (!currentVariant) {
    els.priceValue.textContent = "—";
    els.unitPrice.textContent = "—";
    els.stickyPrice.textContent = "—";
    els.priceUnit.textContent = "Selecione um sabor";
    return;
  }
  const total = currentVariant.price * quantity;
  const unitLabel = `${quantity} ${quantity === 1 ? "unidade" : "unidades"}`;
  els.priceValue.textContent = formatPrice(total);
  els.priceUnit.textContent = unitLabel;
  els.stickyPrice.textContent = formatPrice(total);
  els.unitPrice.textContent = formatPrice(currentVariant.price);
  els.qtyOutput.textContent = String(quantity);
  els.qtyMinus.disabled = quantity <= 1;
}

function updateAvailability() {
  const available = Boolean(currentVariant?.available && storeSettings.store.acceptingOrders);
  els.addBtn.disabled = !available;
  els.stickyAddBtn.disabled = !available;

  if (!storeSettings.store.acceptingOrders) {
    setHidden(els.unavailableNote, false);
    els.unavailableNote.textContent = storeSettings.store.pausedMessage;
  } else if (currentVariant && !currentVariant.available) {
    setHidden(els.unavailableNote, false);
    els.unavailableNote.textContent = "Esse sabor está indisponível no momento.";
  } else {
    setHidden(els.unavailableNote, true);
  }
}

function selectVariant(variantId) {
  const variant = currentProduct.variants.find((v) => v.id === variantId);
  if (!variant) return;
  currentVariant = variant;
  quantity = 1;

  els.variantDesc.textContent = variant.description;
  els.selectedVariantName.textContent = variant.name;
  els.selectedVariantBadge.textContent = variant.badge || "";
  setHidden(els.selectedVariantBadge, !variant.badge);
  setHidden(els.selectedVariant, false);
  setHidden(els.variantError, true);
  els.buyControls.setAttribute("aria-disabled", "false");
  setHidden(els.stickyBar, false);
  renderGallery(variant.images);
  renderVariantList();
  updatePriceDisplay();
  updateAvailability();
}

function addToCart() {
  if (!currentVariant) {
    setHidden(els.variantError, false);
    els.variantList.querySelector("button:not(:disabled)")?.focus();
    return;
  }
  if (!currentVariant.available || !storeSettings.store.acceptingOrders) return;

  addItem({
    productId: currentProduct.id,
    productName: currentProduct.name,
    productSlug: currentProduct.slug,
    variantId: currentVariant.id,
    variantName: currentVariant.name,
    unitPrice: currentVariant.price,
    quantity,
    image: currentVariant.images?.[0] ?? null,
  });

  showToast("Adicionado ao seu pedido ♡");
  quantity = 1;
  updatePriceDisplay();
}

function bindEvents() {
  els.variantList.addEventListener("click", (e) => {
    const btn = e.target.closest(".variant-chip");
    if (!btn) return;
    selectVariant(btn.dataset.variantId);
  });

  els.qtyMinus.addEventListener("click", () => {
    if (quantity > 1) { quantity -= 1; updatePriceDisplay(); }
  });
  els.qtyPlus.addEventListener("click", () => {
    quantity += 1;
    updatePriceDisplay();
  });

  els.addBtn.addEventListener("click", addToCart);
  els.stickyAddBtn.addEventListener("click", addToCart);

  els.galleryDots.addEventListener("click", (e) => {
    const dot = e.target.closest("[data-dot]");
    if (!dot) return;
    const index = Number(dot.dataset.dot);
    const img = els.galleryTrack.children[index];
    img?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  });

  els.galleryTrack.addEventListener("scroll", () => {
    const width = els.galleryTrack.clientWidth;
    const index = Math.round(els.galleryTrack.scrollLeft / width);
    els.galleryDots.querySelectorAll("[data-dot]").forEach((dot, i) => {
      dot.setAttribute("aria-current", String(i === index));
    });
  }, { passive: true });
}

async function init() {
  cacheEls();
  const slug = getQueryParam("slug");

  try {
    const store = await loadStoreData();
    storeSettings = store.settings;
    currentProduct = slug ? getProductBySlug(store, slug) : null;

    setHidden(els.loading, true);

    if (!currentProduct) {
      setHidden(els.notFound, false);
      return;
    }

    setHidden(els.content, false);
    document.title = `${currentProduct.seoTitle || currentProduct.name} — Ateliê da Duda`;

    const category = store.categories.find((c) => c.id === currentProduct.category);
    els.eyebrow.textContent = category ? category.name : "Ateliê da Duda";
    els.breadcrumbName.textContent = currentProduct.name;
    els.name.textContent = currentProduct.name;
    els.desc.textContent = currentProduct.description;

    if (!storeSettings.store.acceptingOrders) {
      setHidden(els.pausedNote, false);
      els.pausedNote.textContent = storeSettings.store.pausedMessage;
    }

    const sortedVariants = [...currentProduct.variants].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    currentVariant = null;
    renderGallery(sortedVariants[0]?.images || []);
    renderVariantList();
    updatePriceDisplay();
    updateAvailability();
    bindEvents();
  } catch (err) {
    console.error(err);
    setHidden(els.loading, true);
    setHidden(els.notFound, false);
  }
}

document.addEventListener("DOMContentLoaded", init);
