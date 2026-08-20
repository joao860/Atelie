// app.js — inicialização comum a todas as páginas do site público:
// header sticky, menu mobile, contador do carrinho, toast, banner, footer.
import { loadStoreData } from "./api.js";
import { subscribe } from "./cart.js";
import { setHidden } from "./utils.js";

function initHeaderScroll() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function initMobileMenu() {
  const menu = document.querySelector("[data-mobile-menu]");
  const openBtn = document.querySelector("[data-menu-open]");
  const closeBtn = document.querySelector("[data-menu-close]");
  const overlay = menu?.querySelector(".mobile-menu__overlay");
  if (!menu || !openBtn) return;

  const open = () => {
    menu.dataset.open = "true";
    document.body.style.overflow = "hidden";
    closeBtn?.focus();
  };
  const close = () => {
    menu.dataset.open = "false";
    document.body.style.overflow = "";
    openBtn.focus();
  };

  openBtn.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);
  overlay?.addEventListener("click", close);
  menu.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
}

function initCartCount() {
  const badges = document.querySelectorAll("[data-cart-count]");
  const miniBar = document.querySelector("[data-mini-cart-bar]");
  const miniBarText = document.querySelector("[data-mini-cart-text]");

  subscribe(({ totalItems, subtotal }) => {
    badges.forEach((badge) => {
      badge.textContent = String(totalItems);
      setHidden(badge, totalItems === 0);
    });

    if (miniBar) {
      const shouldShow = totalItems > 0 && !document.body.dataset.hideMiniCart;
      miniBar.dataset.visible = shouldShow ? "true" : "false";
      if (miniBarText) {
        const itemWord = totalItems === 1 ? "item" : "itens";
        miniBarText.innerHTML = `<strong>${totalItems} ${itemWord}</strong>${new Intl.NumberFormat(
          "pt-BR",
          { style: "currency", currency: "BRL" }
        ).format(subtotal)}`;
      }
    }
  });
}

async function initStoreChrome() {
  try {
    const { settings } = await loadStoreData();

    // Banner global
    const banner = document.querySelector("[data-global-banner]");
    if (banner && settings.banner?.active) {
      banner.textContent = settings.banner.message;
      setHidden(banner, false);
    }

    // WhatsApp/Instagram no footer e header
    document.querySelectorAll("[data-instagram-link]").forEach((el) => {
      el.href = settings.contact.instagramUrl;
    });
    document.querySelectorAll("[data-instagram-handle]").forEach((el) => {
      el.textContent = settings.contact.instagramHandle;
    });
    document.querySelectorAll("[data-whatsapp-link]").forEach((el) => {
      el.href = `https://wa.me/${settings.contact.whatsappNumber}`;
    });
    document.querySelectorAll("[data-store-city]").forEach((el) => {
      el.textContent = settings.brand.city;
    });
    document.querySelectorAll("[data-store-slogan]").forEach((el) => {
      el.textContent = settings.brand.slogan;
    });

    // Aviso de loja pausada, se aplicável
    if (!settings.store.acceptingOrders) {
      document.querySelectorAll("[data-store-paused-notice]").forEach((el) => {
        setHidden(el, false);
        el.textContent = settings.store.pausedMessage;
      });
    }

    document.body.dataset.storeReady = "true";
  } catch (err) {
    console.error("Não foi possível carregar as configurações da loja:", err);
  }
}

function initFooterYear() {
  const el = document.querySelector("[data-current-year]");
  if (el) el.textContent = new Date().getFullYear();
}

document.addEventListener("DOMContentLoaded", () => {
  initHeaderScroll();
  initMobileMenu();
  initCartCount();
  initStoreChrome();
  initFooterYear();
});
