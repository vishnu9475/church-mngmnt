import api, { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "../api/client";

/** Authentication API calls and browser-session token handling. */
export function isAuthenticated() {
  return Boolean(sessionStorage.getItem(ACCESS_TOKEN_KEY));
}

export async function login(username, password) {
  try {
    const { data } = await api.post("/auth/login/", { username, password });
    sessionStorage.setItem(ACCESS_TOKEN_KEY, data.access);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, data.refresh);
  } catch (error) {
    throw new Error(error.response?.data?.detail || "Could not sign in. Check the backend connection and credentials.");
  }
}

export async function logout() {
  const refresh = sessionStorage.getItem(REFRESH_TOKEN_KEY);
  try {
    if (refresh) await api.post("/auth/logout/", { refresh });
  } finally {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export async function requestPasswordReset(email) {
  try {
    const { data } = await api.post("/auth/password-reset/", { email });
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || "Could not request a password reset. Please try again.");
  }
}

export async function confirmPasswordReset(uid, token, newPassword) {
  try {
    const { data } = await api.post("/auth/password-reset/confirm/", {
      uid,
      token,
      new_password: newPassword,
    });
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || "Could not reset the password. The link may have expired.");
  }
}
