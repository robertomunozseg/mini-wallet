"use client";

import useAxios from "axios-hooks";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { LoginResponse } from "@/domain/api";
import type { ApiError, ApiErrorBody } from "@/domain/errors";
import type { LoginInput } from "@/domain/schemas";
import { mapApiError } from "@/lib/map-api-error";
import { useAppDispatch } from "@/store/hooks";
import { hydrate } from "@/store/slices/sessionSlice";

type UseLoginResult = {
  login: (identifier: string) => Promise<void>;
  isLoading: boolean;
  error: ApiError | null;
};

export const useLogin = (): UseLoginResult => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [{ loading, error }, execute] = useAxios<LoginResponse, LoginInput, ApiErrorBody>(
    { url: "/auth/login", method: "POST" },
    { manual: true, useCache: false },
  );

  const login = useCallback(
    async (identifier: string) => {
      let response;
      try {
        response = await execute({ data: { identifier } });
      } catch {
        return; // The failure is exposed through `error`.
      }
      dispatch(hydrate(response.data.user));
      router.replace("/home");
    },
    [execute, dispatch, router],
  );

  const apiError = useMemo(() => (error ? mapApiError(error) : null), [error]);

  return { login, isLoading: loading, error: apiError };
};
