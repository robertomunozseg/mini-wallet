import { beforeEach, describe, expect, it } from "vitest";
import { asCents } from "@/domain/money";
import { createTransactionService } from "../transactionService";
import { resetDb } from "../../mock-db";
import { getReceipt } from "../receiptService";

beforeEach(() => {
  resetDb();
});

describe("receiptService.getReceipt", () => {
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

  it("returns null for an unknown id", () => {
    expect(getReceipt("nope")).toBeNull();
  });

  it("does not create a receipt for a failed transfer", async () => {
    const service = createTransactionService({ newId: () => "tx-1" });
    await service.create(
      { amountCents: asCents(1_000), recipient: "Ana" },
      "key-1",
      "unknown_error",
    );

    expect(getReceipt("tx-1")).toBeNull();
  });
});
