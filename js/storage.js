// storage.js — única camada de acesso ao localStorage do site.
// Nenhum outro arquivo deve chamar localStorage diretamente.

const NAMESPACE = "atelier-da-duda";
const CART_KEY = `${NAMESPACE}:cart`;

function isStorageAvailable() {
  try {
    const testKey = `${NAMESPACE}:__test__`;
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const available = isStorageAvailable();

function read(key, fallback) {
  if (!available) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  if (!available) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const storage = {
  isAvailable: () => available,

  getCart() {
    return read(CART_KEY, { items: [] });
  },

  setCart(cartState) {
    return write(CART_KEY, cartState);
  },

  clearCart() {
    return write(CART_KEY, { items: [] });
  },
};
