import { beforeEach, describe, expect, it } from "vitest";
import { asCents } from "@/domain/money";
import { err, ok } from "@/domain/result";
import type { Receipt } from "@/domain/types";
import {
  getOutcome,
  getReceiptById,
  OUTCOME_TTL_MS,
  resetDb,
  saveOutcome,
  saveReceipt,
} from "../mock-db";

const receipt: Receipt = {
  transaction: {
    id: "tx-1",
    amountCents: asCents(1_000),
    recipient: "Ana",
    createdAt: "2026-10-14T12:00:00.000Z",
    status: "completed",
  },
  newBalanceCents: asCents(99_000),
};

const NOW = Date.parse("2026-10-14T12:00:00.000Z");

beforeEach(() => {
  resetDb();
});

describe("idempotency store", () => {
  it("returns what was stored", () => {
    saveOutcome("key-1", ok(receipt), NOW);
    expect(getOutcome("key-1", NOW)).toEqual({ ok: true, value: receipt });
  });

  describe("TTL", () => {
    it("expires after 24 hours", () => {
      expect(OUTCOME_TTL_MS).toBe(24 * 60 * 60 * 1000);
      saveOutcome("key-1", ok(receipt), NOW);

      expect(getOutcome("key-1", NOW + OUTCOME_TTL_MS)).toBeDefined();
      expect(getOutcome("key-1", NOW + OUTCOME_TTL_MS + 1)).toBeUndefined();
    });
  });

  it("stores failures too", () => {
    const failure = err({ code: "INSUFFICIENT_FUNDS" as const, message: "Insufficient balance." });
    saveOutcome("key-1", failure, NOW);
    expect(getOutcome("key-1", NOW)).toEqual(failure);
  });
});

describe("receipts", () => {
  it("returns a stored receipt by transaction id", () => {
    saveReceipt(receipt);
    expect(getReceiptById("tx-1")).toEqual(receipt);
  });
});
