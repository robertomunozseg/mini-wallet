"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { IdentifierType } from "@/domain/identifier";
import { useLoginForm } from "../hooks/useLoginForm";

const INPUT_MODE_BY_TYPE = {
  email: "email",
  phone: "tel",
  unknown: "text",
} as const satisfies Record<IdentifierType, "email" | "tel" | "text">;

export function LoginForm() {
  const form = useLoginForm();

  return (
    <form onSubmit={form.onSubmit} noValidate className="flex flex-col gap-4">
      <Input
        label="Email or phone"
        name="identifier"
        value={form.identifier}
        onChange={form.onChange}
        onBlur={form.onBlur}
        error={form.fieldError}
        inputMode={INPUT_MODE_BY_TYPE[form.identifierType]}
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
      />
      {form.apiError && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {form.apiError.message}
        </div>
      )}
      <Button type="submit" loading={form.isLoading} incomplete={!form.isComplete}>
        Sign in
      </Button>
    </form>
  );
}
