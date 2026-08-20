// admin/js/configuracoes.js
import { requireAuth, logout } from "./auth.js";
import { loadAdminData, saveAdminData } from "./adminApi.js";

let settings = null;

function fillForm() {
  const f = document.querySelector("[data-settings-form]");
  f.brandName.value = settings.brand.name;
  document.getElementById("brandName").value = settings.brand.name;
  document.getElementById("positioning").value = settings.brand.positioning;
  document.getElementById("slogan").value = settings.brand.slogan;
  document.getElementById("city").value = settings.brand.city;

  document.getElementById("whatsappNumber").value = settings.contact.whatsappNumber;
  document.getElementById("whatsappPrefix").value = settings.contact.whatsappMessagePrefix;
  document.getElementById("instagramHandle").value = settings.contact.instagramHandle;
  document.getElementById("instagramUrl").value = settings.contact.instagramUrl;

  document.getElementById("acceptingOrders").checked = settings.store.acceptingOrders;
  document.getElementById("pausedMessage").value = settings.store.pausedMessage;
  document.getElementById("availabilityMessage").value = settings.store.availabilityMessage;
  document.getElementById("attendanceHours").value = settings.store.attendanceHours;

  document.getElementById("bannerActive").checked = settings.banner.active;
  document.getElementById("bannerMessage").value = settings.banner.message;
}

async function handleSubmit(e) {
  e.preventDefault();
  const statusEl = document.querySelector("[data-form-status]");
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "Salvando…";

  settings.brand.name = document.getElementById("brandName").value.trim();
  settings.brand.positioning = document.getElementById("positioning").value.trim();
  settings.brand.slogan = document.getElementById("slogan").value.trim();
  settings.brand.city = document.getElementById("city").value.trim();

  settings.contact.whatsappNumber = document.getElementById("whatsappNumber").value.trim();
  settings.contact.whatsappMessagePrefix = document.getElementById("whatsappPrefix").value.trim();
  settings.contact.instagramHandle = document.getElementById("instagramHandle").value.trim();
  settings.contact.instagramUrl = document.getElementById("instagramUrl").value.trim();

  settings.store.acceptingOrders = document.getElementById("acceptingOrders").checked;
  settings.store.pausedMessage = document.getElementById("pausedMessage").value.trim();
  settings.store.availabilityMessage = document.getElementById("availabilityMessage").value.trim();
  settings.store.attendanceHours = document.getElementById("attendanceHours").value.trim();

  settings.banner.active = document.getElementById("bannerActive").checked;
  settings.banner.message = document.getElementById("bannerMessage").value.trim();

  statusEl.textContent = "Salvando…";
  const result = await saveAdminData("settings", settings);

  if (!result.ok) {
    statusEl.textContent = result.error || "Erro ao salvar.";
    submitBtn.disabled = false;
    submitBtn.textContent = "Salvar configurações";
    return;
  }

  statusEl.textContent = "Configurações salvas com sucesso ✓";
  submitBtn.disabled = false;
  submitBtn.textContent = "Salvar configurações";
}

async function init() {
  const auth = await requireAuth();
  if (!auth) return;

  document.querySelector("[data-current-year]").textContent = new Date().getFullYear();
  document.querySelector("[data-logout]").addEventListener("click", async () => {
    await logout();
    window.location.href = "login.html";
  });

  const { data } = await loadAdminData("settings");
  settings = data;
  fillForm();

  document.querySelector("[data-settings-form]").addEventListener("submit", handleSubmit);
}

init();
