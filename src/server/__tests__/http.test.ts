// @vitest-environment node
import { describe, expect, it } from "vitest";
import { jsonError, jsonOk } from "../http";

describe("API responses", () => {
  it("never allow a shared cache to store a successful response", () => {
    const response = jsonOk({ ok: true });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("keeps the status codes and bodies", async () => {
    const created = jsonOk({ id: 1 }, 201);
    expect(created.status).toBe(201);
    expect(await created.json()).toEqual({ id: 1 });

    const failure = jsonError({ code: "TIMEOUT", message: "slow" });
    expect(failure.status).toBe(504);
    expect(await failure.json()).toEqual({ error: { code: "TIMEOUT", message: "slow" } });
  });
});
