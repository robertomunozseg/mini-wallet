import type { Movement } from "./types";

// What a movement is sorted by. Pagination cursors store it, so it must be plain data.
export type MovementKey = { createdAt: string; id: string };

export function movementKey(movement: Movement): MovementKey {
  return { createdAt: movement.createdAt, id: movement.id };
}

export function isMovementKey(value: unknown): value is MovementKey {
  return (
    typeof value === "object" &&
    value !== null &&
    "createdAt" in value &&
    typeof value.createdAt === "string" &&
    "id" in value &&
    typeof value.id === "string"
  );
}

// Newest first. The id breaks ties so the order is total (two movements never compare as equal),
// which keyset pagination needs. ISO dates compare correctly as plain strings.
function compareMovementKeys(a: MovementKey, b: MovementKey): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  if (a.id !== b.id) return a.id < b.id ? 1 : -1;
  return 0;
}

export function sortMovements(movements: readonly Movement[]): Movement[] {
  return [...movements].sort((a, b) => compareMovementKeys(movementKey(a), movementKey(b)));
}

// True when `movement` comes after the cursor position in the sort order.
export function isMovementAfter(movement: Movement, key: MovementKey): boolean {
  return compareMovementKeys(movementKey(movement), key) > 0;
}
