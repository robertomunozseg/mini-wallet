"use client";

import useAxios from "axios-hooks";
import { useCallback, useMemo } from "react";
import type { ContactsResponse } from "@/domain/api";
import type { ApiError, ApiErrorBody } from "@/domain/errors";
import type { Contact } from "@/domain/types";
import { mapApiError } from "@/lib/map-api-error";

type UseContactsResult = {
  contacts: Contact[] | null;
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => void;
};

// Fetches on mount. ssr: false because the relative baseURL cannot be requested on the server.
export function useContacts(): UseContactsResult {
  const [{ data, loading, error }, execute] = useAxios<ContactsResponse, undefined, ApiErrorBody>(
    { url: "/contacts" },
    { useCache: false, ssr: false },
  );

  const refetch = useCallback(() => {
    execute().catch(() => {
      // The failure is exposed through `error`.
    });
  }, [execute]);

  const apiError = useMemo(() => (error ? mapApiError(error) : null), [error]);

  return { contacts: data?.contacts ?? null, isLoading: loading, error: apiError, refetch };
}
