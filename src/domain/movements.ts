import type { Movement } from "./types";

// What movements are sorted by. The pagination cursor stores it, so it is plain data.
type MovementKey = { createdAt: string; id: string };

export const movementKey = (movement: Movement): MovementKey => ({
  createdAt: movement.createdAt,
  id: movement.id,
});

export const isMovementKey = (value: unknown): value is MovementKey =>
  typeof value === "object" &&
  value !== null &&
  "createdAt" in value &&
  typeof value.createdAt === "string" &&
  "id" in value &&
  typeof value.id === "string";

// Newest first. The id breaks ties, so two movements are never equal. ISO dates compare
// correctly as plain text.
const compareMovementKeys = (a: MovementKey, b: MovementKey): number => {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  if (a.id !== b.id) return a.id < b.id ? 1 : -1;
  return 0;
};

export const sortMovements = (movements: readonly Movement[]): Movement[] =>
  [...movements].sort((a, b) => compareMovementKeys(movementKey(a), movementKey(b)));

// True when the movement comes after the cursor in the sort order.
export const isMovementAfter = (movement: Movement, key: MovementKey): boolean =>
  compareMovementKeys(movementKey(movement), key) > 0;
