import type { Movement } from "@/domain/types";
import { listMovements } from "../mock-db";

export function list(): Movement[] {
  return listMovements();
}
