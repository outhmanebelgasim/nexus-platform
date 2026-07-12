export type ThemePreference = "light" | "dark";

export const THEME_STORAGE_KEY = "nexus.theme";

export function getStoredThemePreference(): ThemePreference | null {
  const preference = localStorage.getItem(THEME_STORAGE_KEY);
  return preference === "light" || preference === "dark" ? preference : null;
}

export function getSystemThemePreference(): ThemePreference {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getResolvedThemePreference(): ThemePreference {
  return getStoredThemePreference() ?? getSystemThemePreference();
}

export function applyThemePreference(preference: ThemePreference) {
  document.documentElement.classList.toggle("dark", preference === "dark");
}

export function storeThemePreference(preference: ThemePreference) {
  localStorage.setItem(THEME_STORAGE_KEY, preference);
  applyThemePreference(preference);
}
