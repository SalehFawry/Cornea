import axios from "axios";

// Strip trailing slashes. baseURL is the origin only (no /api/v1); each API module appends /api/v1/...
// Empty VITE_API_BASE_URL → same-origin relative URLs (/api/v1/...), correct behind Nginx on :9110.
// Local dev: set VITE_API_BASE_URL in .env (e.g. http://127.0.0.1:8000) so the browser can reach FastAPI directly.
const _origin = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

const API_KEY = import.meta.env.VITE_API_KEY || "";

const client = axios.create({
  // baseURL is the bare origin; every API call appends /api/v1/<resource>.
  // This keeps the prefix consistent regardless of which env file is loaded.
  baseURL: _origin,
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

client.interceptors.request.use((config) => {
  if (API_KEY) {
    config.headers["X-API-Key"] = API_KEY;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("Authentication failed — check VITE_API_KEY");
    }
    return Promise.reject(error);
  },
);

export default client;
