import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
export const ACCESS_TOKEN_KEY = "church_access_token";
export const REFRESH_TOKEN_KEY = "church_refresh_token";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    const refresh = sessionStorage.getItem(REFRESH_TOKEN_KEY);
    if (error.response?.status !== 401 || request?._retry || !refresh || request?.url?.includes("auth/refresh/")) {
      return Promise.reject(error);
    }

    request._retry = true;
    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh/`, { refresh });
      sessionStorage.setItem(ACCESS_TOKEN_KEY, data.access);
      if (data.refresh) sessionStorage.setItem(REFRESH_TOKEN_KEY, data.refresh);
      request.headers.Authorization = `Bearer ${data.access}`;
      return api(request);
    } catch (refreshError) {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
      return Promise.reject(refreshError);
    }
  }
);

export default api;
