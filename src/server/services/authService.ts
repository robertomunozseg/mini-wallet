import type { ApiError } from "@/domain/errors";
import { err, ok, type Result } from "@/domain/result";
import type { User } from "@/domain/types";
import { apiError } from "../api-error";
import { getUser } from "../mock-db";

// Mock rule to see a failed login. Any other valid identifier signs in as the demo user.
export const FAILING_IDENTIFIER = "fail@test.com";

export const login = (identifier: string): Result<User, ApiError> => {
  if (identifier.toLowerCase() === FAILING_IDENTIFIER) {
    return err(apiError("INVALID_CREDENTIALS", "Invalid credentials. Please try again."));
  }
  return ok(getUser());
};
