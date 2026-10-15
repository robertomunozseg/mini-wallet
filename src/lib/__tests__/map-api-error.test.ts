import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { describe, expect, it } from "vitest";
import { mapApiError } from "../map-api-error";

const httpError = (status: number, data: unknown): AxiosError => {
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
};
describe("mapApiError", () => {
  it("maps ECONNABORTED to TIMEOUT", () => {
    const error = new AxiosError("timeout of 8000ms exceeded", AxiosError.ECONNABORTED);
    expect(mapApiError(error)).toMatchObject({ code: "TIMEOUT" });
  });

  it("maps an axios error without response to NETWORK_ERROR", () => {
    const error = new AxiosError("Network Error", AxiosError.ERR_NETWORK);
    expect(mapApiError(error)).toMatchObject({ code: "NETWORK_ERROR" });
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

  it.each(["INSUFFICIENT_FUNDS", "INVALID_CREDENTIALS", "UNKNOWN_ERROR", "UNAUTHORIZED"] as const)(
    "shows a fixed user-facing message for %s, not the server message",
    (code) => {
      const mapped = mapApiError(httpError(422, { error: { code, message: "raw server text" } }));
      expect(mapped.message).not.toBe("raw server text");
      expect(mapped.message).not.toBe("");
    },
  );

  describe("VALIDATION_ERROR", () => {
    it("shows the server message, which the API writes for the user", () => {
      const error = httpError(400, {
        error: {
          code: "VALIDATION_ERROR",
          message: "A contact with this phone or email already exists.",
        },
      });
      expect(mapApiError(error)).toEqual({
        code: "VALIDATION_ERROR",
        message: "A contact with this phone or email already exists.",
      });
    });
  });
});
