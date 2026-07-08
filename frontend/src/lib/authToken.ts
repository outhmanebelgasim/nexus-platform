const TOKEN_KEY = "nexus.auth.token";

// TODO: Move JWT storage to an httpOnly secure cookie when the backend supports cookie-based auth.
export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}
