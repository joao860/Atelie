// order-page.js — renderiza a página "Seu pedido" (pedido.html)
import { loadStoreData } from "./api.js";
import { subscribe, updateQuantity, removeItem, clearCart } from "./cart.js";
import { buildWhatsappUrl } from "./whatsapp.js";
import { formatPrice, escapeHtml, setHidden } from "./utils.js";
import { showToast } from "./toast.js";

const els = {
  empty: document.querySelector("[data-cart-empty]"),
  filled: document.querySelector("[data-cart-filled]"),
  list: document.querySelector("[data-cart-list]"),
  subtotal: document.querySelector("[data-cart-subtotal]"),
  total: document.querySelector("[data-cart-total]"),
  countLabel: document.querySelector("[data-cart-count-label]"),
  checkoutBtn: document.querySelector("[data-checkout-btn]"),
  pausedNote: document.querySelector("[data-cart-paused-note]"),
  clearBtn: document.querySelector("[data-clear-cart]"),
  clearModal: document.querySelector("[data-clear-modal]"),
  afterCheckout: document.querySelector("[data-after-checkout]"),
};

let settings = null;

function itemRowHtml(item) {
  const media = item.image
    ? `<img src="${item.image}" alt="${escapeHtml(item.productName)}" width="84" height="84" loading="lazy" />`
    : `<div class="placeholder-media" style="width:100%;height:100%" role="img" aria-label="Foto em breve"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28"><path d="M4 7h16v13H4z"/><path d="M4 7l3-4h10l3 4"/><circle cx="12" cy="14" r="3.2"/></svg></div>`;

  return `
    <li class="cart-item" data-item-id="${item.id}">
      <div class="cart-item__media">${media}</div>
      <div class="cart-item__body">
        <span class="cart-item__name">${escapeHtml(item.productName)}</span>
        <span class="cart-item__variant">${escapeHtml(item.variantName)}</span>
        <span class="cart-item__unit">${formatPrice(item.unitPrice)} por unidade</span>
        <div class="cart-item__row">
          <div class="qty-stepper" role="group" aria-label="Quantidade de ${escapeHtml(item.productName)}">
            <button type="button" data-action="decrease" aria-label="Diminuir quantidade">−</button>
            <output>${item.quantity}</output>
            <button type="button" data-action="increase" aria-label="Aumentar quantidade">+</button>
          </div>
          <span class="cart-item__price">${formatPrice(item.unitPrice * item.quantity)}</span>
        </div>
        <div class="cart-item__row">
          <button type="button" class="cart-item__remove" data-action="remove">Remover</button>
        </div>
      </div>
    </li>
  `;
}

function render({ items, totalItems, subtotal }) {
  const hasItems = items.length > 0;
  setHidden(els.empty, hasItems);
  setHidden(els.filled, !hasItems);
  if (!hasItems) return;

  els.list.innerHTML = items.map(itemRowHtml).join("");
  els.subtotal.textContent = formatPrice(subtotal);
  els.total.textContent = formatPrice(subtotal);
  els.countLabel.textContent = `${totalItems} ${totalItems === 1 ? "item" : "itens"}`;

  const canCheckout = settings?.store?.acceptingOrders !== false;
  els.checkoutBtn.disabled = !canCheckout;
  els.checkoutBtn.dataset.items = JSON.stringify(items);
  els.checkoutBtn.dataset.subtotal = String(subtotal);
}

function openClearModal() {
  els.clearModal.hidden = false;
  document.body.style.overflow = "hidden";
  els.clearModal.querySelector("[data-modal-confirm]").focus();
}

function closeClearModal() {
  els.clearModal.hidden = true;
  document.body.style.overflow = "";
  els.clearBtn?.focus();
}

function confirmClear(message = "Carrinho esvaziado.") {
  clearCart();
  closeClearModal();
  setHidden(els.afterCheckout, true);
  showToast(message);
}

function bindListEvents() {
  els.list.addEventListener("click", (e) => {
    const row = e.target.closest("[data-item-id]");
    if (!row) return;
    const itemId = row.dataset.itemId;
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (!action) return;

    if (action === "remove") {
      removeItem(itemId);
      return;
    }
    const output = row.querySelector("output");
    const current = Number(output.textContent);
    const next = action === "increase" ? current + 1 : current - 1;
    if (next < 1) {
      removeItem(itemId);
    } else {
      updateQuantity(itemId, next);
    }
  });

  els.checkoutBtn.addEventListener("click", () => {
    const items = JSON.parse(els.checkoutBtn.dataset.items || "[]");
    const subtotal = Number(els.checkoutBtn.dataset.subtotal || 0);
    if (!items.length || !settings) return;
    const url = buildWhatsappUrl({ items, subtotal, settings });
    window.open(url, "_blank", "noopener");
    setHidden(els.afterCheckout, false);
    els.afterCheckout.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  els.clearBtn.addEventListener("click", openClearModal);
  els.clearModal.querySelectorAll("[data-modal-cancel]").forEach((el) => el.addEventListener("click", closeClearModal));
  els.clearModal.querySelector("[data-modal-confirm]").addEventListener("click", () => confirmClear());
  document.querySelector("[data-keep-cart]").addEventListener("click", () => setHidden(els.afterCheckout, true));
  document.querySelector("[data-confirm-sent]").addEventListener("click", () => {
    clearCart();
    setHidden(els.afterCheckout, true);
    showToast("Pedido limpo. Obrigada! ♡");
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !els.clearModal.hidden) closeClearModal(); });
}

async function init() {
  const store = await loadStoreData();
  settings = store.settings;

  if (!settings.store.acceptingOrders) {
    setHidden(els.pausedNote, false);
    els.pausedNote.textContent = settings.store.pausedMessage;
  }

  bindListEvents();
  subscribe(render);
}

document.addEventListener("DOMContentLoaded", init);
