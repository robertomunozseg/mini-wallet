import type { Movement } from "./types";

// Newest first. The id breaks ties, so the order is always the same. ISO dates compare
// correctly as plain text.
export const sortMovements = (movements: readonly Movement[]): Movement[] =>
  [...movements].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    if (a.id !== b.id) return a.id < b.id ? 1 : -1;
    return 0;
  });
