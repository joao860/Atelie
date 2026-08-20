// admin/js/auth.js
// Verifica autenticação contra a Cloudflare Function /api/admin-session.
// O admin exige sempre autenticação real validada no servidor.

export async function checkSession() {
  try {
    const res = await fetch("/api/admin-session", { credentials: "include" });
    const contentType = res.headers.get("content-type") || "";
    if (!res.ok || !contentType.includes("application/json")) return { backendAvailable: false, authenticated: false };
    const data = await res.json();
    if (data.configured === false) {
      return { backendAvailable: false, authenticated: false };
    }
    return { backendAvailable: true, authenticated: Boolean(data.authenticated) };
  } catch {
    return {
      backendAvailable: false,
      authenticated: false,
    };
  }
}

export async function login(password) {
  try {
    const res = await fetch("/api/admin-login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => ({}));
    if (res.status === 404 || res.status === 405 || res.status === 500) {
      return { ok: false, backendUnavailable: true };
    }
    return { ok: false, error: data.error || "Não foi possível entrar." };
  } catch {
    return { ok: false, backendUnavailable: true };
  }
}

export async function logout() {
  try {
    await fetch("/api/admin-session", { method: "DELETE", credentials: "include" });
  } catch {
    /* backend indisponível */
  }
}

/**
 * Protege uma página administrativa: redireciona para o login se não
 * autenticado. Deve ser chamado no topo de cada página protegida.
 */
export async function requireAuth() {
  const { backendAvailable, authenticated } = await checkSession();
  if (!authenticated) {
    window.location.href = "login.html";
    return null;
  }
  return { backendAvailable };
}
