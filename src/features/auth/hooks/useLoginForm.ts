"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { detectIdentifierType } from "@/domain/identifier";
import { loginSchema } from "@/domain/schemas";
import { useLogin } from "./useLogin";

// Form state and validation for LoginForm. The field is validated on blur and on submit.
export function useLoginForm() {
  const { login, isLoading, error: apiError } = useLogin();
  const [identifier, setIdentifier] = useState("");
  const [touched, setTouched] = useState(false);

  const validation = loginSchema.safeParse({ identifier });
  const fieldError =
    touched && !validation.success ? validation.error.issues[0]?.message : undefined;

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    setIdentifier(event.target.value);
  }

  function onBlur() {
    setTouched(true);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!validation.success || isLoading) return;
    void login(validation.data.identifier);
  }

  return {
    identifier,
    identifierType: detectIdentifierType(identifier),
    fieldError,
    isComplete: validation.success,
    isLoading,
    apiError,
    onChange,
    onBlur,
    onSubmit,
  };
}
