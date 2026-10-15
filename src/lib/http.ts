import axios from "axios";
import { configure } from "axios-hooks";

// Shorter than the server's 10 s "timeout" scenario, so the client gives up first.
const REQUEST_TIMEOUT_MS = 8000;

export const http = axios.create({
  baseURL: "/api",
  timeout: REQUEST_TIMEOUT_MS,
  withCredentials: true,
});

// useCache: false, so a balance or a list is never shown stale.
configure({ axios: http, defaultOptions: { useCache: false } });
