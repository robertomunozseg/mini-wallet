import { beforeEach, describe, expect, it } from "vitest";
import { asCents } from "@/domain/money";
import { err, ok } from "@/domain/result";
import type { Receipt } from "@/domain/types";
import {
  getOutcome,
  listMovements,
  MAX_STORED_OUTCOMES,
  OUTCOME_TTL_MS,
  outcomeCount,
  resetDb,
  saveOutcome,
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

  it("returns undefined for an unknown key", () => {
    expect(getOutcome("nope", NOW)).toBeUndefined();
  });

  describe("TTL", () => {
    it("expires after 24 hours", () => {
      expect(OUTCOME_TTL_MS).toBe(24 * 60 * 60 * 1000);
      saveOutcome("key-1", ok(receipt), NOW);

      expect(getOutcome("key-1", NOW + OUTCOME_TTL_MS)).toBeDefined();
      expect(getOutcome("key-1", NOW + OUTCOME_TTL_MS + 1)).toBeUndefined();
    });

    it("removes the expired entry", () => {
      saveOutcome("key-1", ok(receipt), NOW);
      getOutcome("key-1", NOW + OUTCOME_TTL_MS + 1);
      expect(outcomeCount()).toBe(0);
    });

    it("storing a key again restarts its time", () => {
      saveOutcome("key-1", ok(receipt), NOW);
      saveOutcome("key-1", ok(receipt), NOW + OUTCOME_TTL_MS);
      expect(getOutcome("key-1", NOW + OUTCOME_TTL_MS + 1_000)).toBeDefined();
    });
  });

  describe("size cap", () => {
    it("never holds more than the maximum", () => {
      expect(MAX_STORED_OUTCOMES).toBe(10_000);
      for (let index = 0; index < MAX_STORED_OUTCOMES + 500; index += 1) {
        saveOutcome(`key-${index}`, ok(receipt), NOW);
      }
      expect(outcomeCount()).toBe(MAX_STORED_OUTCOMES);
    });

    it("drops the oldest entries first and keeps the newest", () => {
      for (let index = 0; index < MAX_STORED_OUTCOMES + 3; index += 1) {
        saveOutcome(`key-${index}`, ok(receipt), NOW);
      }
      expect(getOutcome("key-0", NOW)).toBeUndefined();
      expect(getOutcome("key-2", NOW)).toBeUndefined();
      expect(getOutcome("key-3", NOW)).toBeDefined();
      expect(getOutcome(`key-${MAX_STORED_OUTCOMES + 2}`, NOW)).toBeDefined();
    });

    it("a repeated key counts as recent and survives the cleanup", () => {
      for (let index = 0; index < MAX_STORED_OUTCOMES; index += 1) {
        saveOutcome(`key-${index}`, ok(receipt), NOW);
      }
      saveOutcome("key-0", ok(receipt), NOW); // key-0 is now the newest
      saveOutcome("extra", ok(receipt), NOW); // pushes out the oldest, which is key-1

      expect(getOutcome("key-0", NOW)).toBeDefined();
      expect(getOutcome("key-1", NOW)).toBeUndefined();
    });
  });

  it("stores failures too", () => {
    const failure = err({ code: "INSUFFICIENT_FUNDS" as const, message: "Insufficient balance." });
    saveOutcome("key-1", failure, NOW);
    expect(getOutcome("key-1", NOW)).toEqual(failure);
  });
});

describe("listMovements", () => {
  it("returns the seeded movements newest first", () => {
    const movements = listMovements();
    expect(movements).toHaveLength(8);
    const dates = movements.map((movement) => movement.createdAt);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});
