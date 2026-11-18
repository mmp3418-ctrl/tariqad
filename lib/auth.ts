export const AUTH_STORAGE_KEY = "tariq-admin-session";
export const AUTH_COOKIE_NAME = "tariq_admin_session";

export const VALID_USERNAME = "admin";
export const VALID_PASSWORD = "tariq2026";

export type AdminSession = {
  username: string;
  loggedInAt: string;
};

export function createSession(username: string): AdminSession {
  return {
    username,
    loggedInAt: new Date().toISOString(),
  };
}

export function persistSession(session: AdminSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  document.cookie = `${AUTH_COOKIE_NAME}=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

export function readSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminSession;
    if (!parsed?.username) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function validateCredentials(username: string, password: string): boolean {
  return (
    username.trim() === VALID_USERNAME && password === VALID_PASSWORD
  );
}
