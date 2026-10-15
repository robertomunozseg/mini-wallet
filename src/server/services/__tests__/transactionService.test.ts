import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { asCents } from "@/domain/money";
import { getBalance, listMovements, resetDb } from "../../mock-db";
import { createTransactionService, getReceipt, TIMEOUT_DELAY_MS } from "../transactionService";

const SEEDED_BALANCE = 1_250_000;

afterEach(() => {
  vi.unstubAllEnvs();
});

const setup = () => {
  const sleep = vi.fn<(ms: number) => Promise<void>>().mockResolvedValue(undefined);
  let nextId = 0;
  const service = createTransactionService({
    sleep,
    now: () => new Date("2026-10-14T12:00:00.000Z"),
    newId: () => `id-${++nextId}`,
  });
  return { service, sleep };
};
const transfer = (amountCents: number, recipient = "Ana García") => {
  return { amountCents: asCents(amountCents), recipient };
};
describe("transactionService.create", () => {
  beforeEach(() => {
    resetDb();
  });

  describe("server-side rules", () => {
    it("creates a receipt, debits the balance and records a movement on success", async () => {
      const { service } = setup();
      const movementsBefore = listMovements().length;

      const result = await service.create(transfer(50_000), "key-1", "success");

      expect(result).toEqual({
        ok: true,
        value: {
          transaction: {
            id: "id-1",
            amountCents: 50_000,
            recipient: "Ana García",
            createdAt: "2026-10-14T12:00:00.000Z",
            status: "completed",
          },
          newBalanceCents: SEEDED_BALANCE - 50_000,
        },
      });
      expect(getBalance()).toBe(SEEDED_BALANCE - 50_000);
      expect(listMovements()).toHaveLength(movementsBefore + 1);
      expect(listMovements()[0]).toMatchObject({ type: "outgoing", counterpartName: "Ana García" });
    });

    it("allows transferring exactly the balance", async () => {
      const { service } = setup();
      const result = await service.create(transfer(SEEDED_BALANCE), "key-1", "success");
      expect(result.ok).toBe(true);
      expect(getBalance()).toBe(0);
    });

    it("rejects balance + 1 cent with INSUFFICIENT_FUNDS and does not debit", async () => {
      const { service } = setup();
      const result = await service.create(transfer(SEEDED_BALANCE + 1), "key-1", "success");
      expect(result).toMatchObject({ ok: false, error: { code: "INSUFFICIENT_FUNDS" } });
      expect(getBalance()).toBe(SEEDED_BALANCE);
    });

    it("rejects an empty recipient with VALIDATION_ERROR", async () => {
      const { service } = setup();
      const result = await service.create(transfer(1_000, "   "), "key-1", "success");
      expect(result).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
      expect(getBalance()).toBe(SEEDED_BALANCE);
    });
  });

  describe("scenarios", () => {
    it("network_error fails with NETWORK_ERROR and does not debit", async () => {
      const { service } = setup();
      const result = await service.create(transfer(1_000), "key-1", "network_error");
      expect(result).toMatchObject({ ok: false, error: { code: "NETWORK_ERROR" } });
      expect(getBalance()).toBe(SEEDED_BALANCE);
    });

    it("insufficient_funds fails with INSUFFICIENT_FUNDS even if the balance is enough", async () => {
      const { service } = setup();
      const result = await service.create(transfer(1_000), "key-1", "insufficient_funds");
      expect(result).toMatchObject({ ok: false, error: { code: "INSUFFICIENT_FUNDS" } });
      expect(getBalance()).toBe(SEEDED_BALANCE);
    });

    it("timeout waits 10 seconds, then fails with TIMEOUT", async () => {
      const { service, sleep } = setup();
      const result = await service.create(transfer(1_000), "key-1", "timeout");
      expect(sleep).toHaveBeenCalledWith(TIMEOUT_DELAY_MS);
      expect(TIMEOUT_DELAY_MS).toBe(10_000);
      expect(result).toMatchObject({ ok: false, error: { code: "TIMEOUT" } });
      expect(getBalance()).toBe(SEEDED_BALANCE);
    });

    it("timeout waits MOCK_TIMEOUT_DELAY_MS when it is set (used by the e2e tests)", async () => {
      vi.stubEnv("MOCK_TIMEOUT_DELAY_MS", "300");
      const { service, sleep } = setup();
      const result = await service.create(transfer(1_000), "key-1", "timeout");
      expect(sleep).toHaveBeenCalledWith(300);
      expect(result).toMatchObject({ ok: false, error: { code: "TIMEOUT" } });
    });

    it("unknown_error fails with UNKNOWN_ERROR", async () => {
      const { service } = setup();
      const result = await service.create(transfer(1_000), "key-1", "unknown_error");
      expect(result).toMatchObject({ ok: false, error: { code: "UNKNOWN_ERROR" } });
      expect(getBalance()).toBe(SEEDED_BALANCE);
    });
  });

  describe("idempotency", () => {
    it("returns the same receipt and debits only once when the key is repeated", async () => {
      const { service } = setup();
      const movementsBefore = listMovements().length;

      const first = await service.create(transfer(50_000), "key-1", "success");
      const second = await service.create(transfer(50_000), "key-1", "success");

      expect(second).toEqual(first);
      expect(getBalance()).toBe(SEEDED_BALANCE - 50_000);
      expect(listMovements()).toHaveLength(movementsBefore + 1);
    });

    it("stores insufficient_funds, so a retry with the same key gets the same answer", async () => {
      const { service } = setup();
      const first = await service.create(transfer(1_000), "key-1", "insufficient_funds");
      const second = await service.create(transfer(1_000), "key-1", "success");
      expect(second).toEqual(first);
      expect(getBalance()).toBe(SEEDED_BALANCE);
    });

    it.each(["network_error", "timeout", "unknown_error"] as const)(
      "does not store %s, so a retry with the same key can succeed",
      async (scenario) => {
        const { service } = setup();
        const failed = await service.create(transfer(1_000), "key-1", scenario);
        expect(failed.ok).toBe(false);

        const retry = await service.create(transfer(1_000), "key-1", "success");
        expect(retry.ok).toBe(true);
        expect(getBalance()).toBe(SEEDED_BALANCE - 1_000);
      },
    );
  });
});

beforeEach(() => {
  resetDb();
});

describe("getReceipt", () => {
  it("returns the receipt of a completed transfer, by transaction id", async () => {
    const service = createTransactionService({ newId: () => "tx-1" });
    const created = await service.create(
      { amountCents: asCents(50_000), recipient: "Ana García" },
      "key-1",
      "success",
    );

    expect(created.ok).toBe(true);
    expect(getReceipt("tx-1")).toEqual(created.ok ? created.value : null);
  });
});
