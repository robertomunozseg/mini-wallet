import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { describe, expect, it } from "vitest";
import { mapApiError } from "../map-api-error";

function httpError(status: number, data: unknown): AxiosError {
  const response: AxiosResponse = {
    data,
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
  return new AxiosError(
    "Request failed",
    AxiosError.ERR_BAD_RESPONSE,
    undefined,
    undefined,
    response,
  );
}

describe("mapApiError", () => {
  it("maps ECONNABORTED to TIMEOUT", () => {
    const error = new AxiosError("timeout of 8000ms exceeded", AxiosError.ECONNABORTED);
    expect(mapApiError(error)).toMatchObject({ code: "TIMEOUT" });
  });

  it("maps ETIMEDOUT to TIMEOUT", () => {
    const error = new AxiosError("timeout", AxiosError.ETIMEDOUT);
    expect(mapApiError(error)).toMatchObject({ code: "TIMEOUT" });
  });

  it("maps an axios error without response to NETWORK_ERROR", () => {
    const error = new AxiosError("Network Error", AxiosError.ERR_NETWORK);
    expect(mapApiError(error)).toMatchObject({ code: "NETWORK_ERROR" });
  });

  it("maps a canceled request to UNKNOWN_ERROR", () => {
    const error = new AxiosError("canceled", AxiosError.ERR_CANCELED);
    expect(mapApiError(error)).toMatchObject({ code: "UNKNOWN_ERROR" });
  });

  it.each([
    "INVALID_CREDENTIALS",
    "VALIDATION_ERROR",
    "INSUFFICIENT_FUNDS",
    "NETWORK_ERROR",
    "TIMEOUT",
    "UNAUTHORIZED",
    "UNKNOWN_ERROR",
  ] as const)("uses the code %s sent in the response body", (code) => {
    const error = httpError(422, { error: { code, message: "server message" } });
    expect(mapApiError(error).code).toBe(code);
  });

  it("returns a user-facing message, not the server message", () => {
    const error = httpError(422, {
      error: { code: "INSUFFICIENT_FUNDS", message: "raw server text" },
    });
    const mapped = mapApiError(error);
    expect(mapped.message).not.toBe("raw server text");
    expect(mapped.message).toMatch(/balance/i);
  });

  it.each([
    ["an unknown code", { error: { code: "SOMETHING_ELSE", message: "x" } }],
    ["a prototype property as code", { error: { code: "toString", message: "x" } }],
    ["a body without error", { message: "boom" }],
    ["an error that is not an object", { error: "boom" }],
    ["an error without code", { error: { message: "x" } }],
    ["a non-string code", { error: { code: 500, message: "x" } }],
    ["a string body", "<html>Bad gateway</html>"],
    ["a null body", null],
  ])("maps a response with %s to UNKNOWN_ERROR", (_name, body) => {
    expect(mapApiError(httpError(500, body))).toMatchObject({ code: "UNKNOWN_ERROR" });
  });

  it.each([
    ["an Error", new Error("boom")],
    ["a string", "boom"],
    ["null", null],
    ["undefined", undefined],
    ["a plain object", { error: { code: "TIMEOUT" } }],
  ])("maps %s that is not an axios error to UNKNOWN_ERROR", (_name, error) => {
    expect(mapApiError(error)).toMatchObject({ code: "UNKNOWN_ERROR" });
  });

  it("always returns a non-empty message", () => {
    expect(mapApiError(new Error("boom")).message).not.toBe("");
  });
});
