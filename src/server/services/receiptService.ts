import type { Receipt } from "@/domain/types";
import { getReceiptById } from "../mock-db";

// Single-user mock: every receipt belongs to the signed-in user, so the page only needs to
// check that the session exists. With real users this would also compare the owner.
export function getReceipt(transactionId: string): Receipt | null {
  return getReceiptById(transactionId) ?? null;
}
