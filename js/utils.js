// utils.js — funções puras reutilizadas em todo o projeto

/**
 * Formata um número como moeda brasileira (R$ 13,00).
 */
export function formatPrice(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Gera um slug simples a partir de um texto.
 */
export function slugify(text) {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Debounce simples para inputs de busca.
 */
export function debounce(fn, delay = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Lê um parâmetro da query string atual.
 */
export function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/**
 * Gera um id curto e razoavelmente único (suficiente para itens de carrinho).
 */
export function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Escapa texto para uso seguro em innerHTML.
 */
export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

/**
 * Ativa/desativa um elemento por atributo hidden, respeitando foco.
 */
export function setHidden(el, hidden) {
  if (!el) return;
  el.hidden = hidden;
}
