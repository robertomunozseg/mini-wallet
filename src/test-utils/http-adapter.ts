import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { http } from "@/lib/http";

type Handler = (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>;

// Replaces the network layer of the shared axios instance, so tests run the real axios,
// axios-hooks and mapApiError code. Returns a function that restores the original adapter.
export const installHttpAdapter = (handler: Handler): (() => void) => {
  const original = http.defaults.adapter;
  http.defaults.adapter = handler;
  return () => {
    http.defaults.adapter = original;
  };
};
export const jsonResponse = (
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown,
): Promise<AxiosResponse> => {
  const response: AxiosResponse = { data, status, statusText: "", headers: {}, config };
  if (status >= 200 && status < 300) return Promise.resolve(response);
  return Promise.reject(
    new AxiosError("Request failed", AxiosError.ERR_BAD_RESPONSE, config, null, response),
  );
};
export const networkError = (config: InternalAxiosRequestConfig): Promise<never> => {
  return Promise.reject(new AxiosError("Network Error", AxiosError.ERR_NETWORK, config));
};
export const timeoutError = (config: InternalAxiosRequestConfig): Promise<never> => {
  return Promise.reject(
    new AxiosError("timeout of 8000ms exceeded", AxiosError.ECONNABORTED, config),
  );
};
// axios serializes the body to a JSON string before it reaches the adapter.
export const readBody = (config: InternalAxiosRequestConfig): unknown => {
  return typeof config.data === "string" ? JSON.parse(config.data) : config.data;
};
