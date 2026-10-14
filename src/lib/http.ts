import axios from "axios";
import { configure } from "axios-hooks";

// Shorter than the 10s "timeout" scenario of the server, so the client gives up first.
const REQUEST_TIMEOUT_MS = 8000;

export const http = axios.create({
  baseURL: "/api",
  timeout: REQUEST_TIMEOUT_MS,
  withCredentials: true,
});

// useCache: false so balances and movements are never shown stale.
configure({ axios: http, defaultOptions: { useCache: false } });
