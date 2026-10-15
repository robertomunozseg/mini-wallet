"use client";

import useAxios from "axios-hooks";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import type { ContactResponse } from "@/domain/api";
import type { ApiError, ApiErrorBody } from "@/domain/errors";
import { newContactSchema, type NewContactInput } from "@/domain/schemas";
import type { Contact } from "@/domain/types";
import { mapApiError } from "@/lib/map-api-error";

type Field = "name" | "phoneOrEmail";
type FieldErrors = Partial<Record<Field, string>>;

type UseNewContactFormOptions = {
  onCreated: (contact: Contact) => void;
};

// Form state, validation (newContactSchema) and the POST /contacts request for NewContactForm.
export function useNewContactForm({ onCreated }: UseNewContactFormOptions) {
  const [name, setName] = useState("");
  const [phoneOrEmail, setPhoneOrEmail] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [touched, setTouched] = useState<Record<Field, boolean>>({
    name: false,
    phoneOrEmail: false,
  });

  const [{ loading, error }, execute] = useAxios<ContactResponse, NewContactInput, ApiErrorBody>(
    { url: "/contacts", method: "POST" },
    { manual: true, useCache: false },
  );

  const validation = newContactSchema.safeParse({ name, phoneOrEmail, isFavorite });

  // First message per field, shown only for fields the user already touched.
  const fieldErrors = useMemo(() => {
    const errors: FieldErrors = {};
    if (validation.success) return errors;
    for (const issue of validation.error.issues) {
      const field = issue.path[0];
      if ((field === "name" || field === "phoneOrEmail") && touched[field] && !errors[field]) {
        errors[field] = issue.message;
      }
    }
    return errors;
  }, [validation, touched]);

  const apiError: ApiError | null = useMemo(() => (error ? mapApiError(error) : null), [error]);

  function touch(field: Field) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ name: true, phoneOrEmail: true });
    if (!validation.success || loading) return;

    try {
      const response = await execute({ data: validation.data });
      onCreated(response.data.contact);
    } catch {
      // The failure is exposed through `apiError`.
    }
  }

  return {
    name,
    phoneOrEmail,
    isFavorite,
    fieldErrors,
    isComplete: validation.success,
    isLoading: loading,
    apiError,
    onNameChange: (event: ChangeEvent<HTMLInputElement>) => setName(event.target.value),
    onPhoneOrEmailChange: (event: ChangeEvent<HTMLInputElement>) =>
      setPhoneOrEmail(event.target.value),
    onFavoriteChange: (event: ChangeEvent<HTMLInputElement>) => setIsFavorite(event.target.checked),
    onNameBlur: () => touch("name"),
    onPhoneOrEmailBlur: () => touch("phoneOrEmail"),
    onSubmit,
  };
}
