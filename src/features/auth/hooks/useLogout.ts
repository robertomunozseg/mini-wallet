"use client";

import useAxios from "axios-hooks";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { LogoutResponse } from "@/domain/api";
import type { ApiError, ApiErrorBody } from "@/domain/errors";
import { mapApiError } from "@/lib/map-api-error";
import { useAppDispatch } from "@/store/hooks";
import { clear } from "@/store/slices/sessionSlice";

type UseLogoutResult = {
  logout: () => Promise<void>;
  isLoading: boolean;
  error: ApiError | null;
};

export function useLogout(): UseLogoutResult {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [{ loading, error }, execute] = useAxios<LogoutResponse, undefined, ApiErrorBody>(
    { url: "/auth/logout", method: "POST" },
    { manual: true, useCache: false },
  );

  const logout = useCallback(async () => {
    try {
      await execute();
    } catch (caught) {
      // A 401 means the session is already gone, so signing out is done anyway.
      // Any other failure keeps the user signed in and shows the error.
      if (mapApiError(caught).code !== "UNAUTHORIZED") return;
    }
    dispatch(clear());
    router.replace("/login");
  }, [execute, dispatch, router]);

  const apiError = useMemo(() => (error ? mapApiError(error) : null), [error]);

  return { logout, isLoading: loading, error: apiError };
}
