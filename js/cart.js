// cart.js — estado do carrinho, persistido via storage.js
import { storage } from "./storage.js";
import { generateId } from "./utils.js";

let state = storage.getCart();
const listeners = new Set();

function persist() {
  storage.setCart(state);
  notify();
}

function notify() {
  const snapshot = getCart();
  listeners.forEach((fn) => fn(snapshot));
}

/**
 * Retorna uma cópia do estado atual do carrinho com totais calculados.
 */
export function getCart() {
  const items = state.items ?? [];
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  return { items, totalItems, subtotal };
}

/**
 * Adiciona um item ao carrinho. Se já existir a mesma combinação
 * produto+variação, soma a quantidade em vez de duplicar a linha.
 */
export function addItem({ productId, productName, productSlug, variantId, variantName, unitPrice, quantity, image }) {
  const items = state.items ?? [];
  const existing = items.find((i) => i.productId === productId && i.variantId === variantId);

  if (existing) {
    existing.quantity += quantity;
  } else {
    items.push({
      id: generateId(),
      productId,
      productName,
      productSlug,
      variantId,
      variantName,
      unitPrice,
      quantity,
      image,
    });
  }

  state = { items };
  persist();
}

export function updateQuantity(itemId, quantity) {
  const items = (state.items ?? []).map((item) =>
    item.id === itemId ? { ...item, quantity: Math.max(1, quantity) } : item
  );
  state = { items };
  persist();
}

export function removeItem(itemId) {
  const items = (state.items ?? []).filter((item) => item.id !== itemId);
  state = { items };
  persist();
}

export function clearCart() {
  state = { items: [] };
  persist();
}

/**
 * Inscreve um callback para ser chamado sempre que o carrinho mudar.
 * Retorna uma função para cancelar a inscrição.
 */
export function subscribe(fn) {
  listeners.add(fn);
  fn(getCart());
  return () => listeners.delete(fn);
}
