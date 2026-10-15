"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { Contact } from "@/domain/types";
import { useNewContactForm } from "../hooks/useNewContactForm";

type NewContactFormProps = {
  onCreated: (contact: Contact) => void;
  onCancel: () => void;
};

export const NewContactForm = ({ onCreated, onCancel }: NewContactFormProps) => {
  const form = useNewContactForm({ onCreated });

  return (
    <Card>
      <form onSubmit={form.onSubmit} noValidate className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-zinc-900">New contact</h3>
        <Input
          label="Name"
          name="name"
          value={form.name}
          onChange={form.onNameChange}
          onBlur={form.onNameBlur}
          error={form.fieldErrors.name}
          autoComplete="off"
        />
        <Input
          label="Email or phone"
          name="phoneOrEmail"
          value={form.phoneOrEmail}
          onChange={form.onPhoneOrEmailChange}
          onBlur={form.onPhoneOrEmailBlur}
          error={form.fieldErrors.phoneOrEmail}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <label className="flex min-h-11 items-center gap-3 text-zinc-900">
          <input
            type="checkbox"
            checked={form.isFavorite}
            onChange={form.onFavoriteChange}
            className="h-4 w-4 accent-blue-600"
          />
          Add to favorites
        </label>
        {form.apiError && (
          <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {form.apiError.message}
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" loading={form.isLoading} incomplete={!form.isComplete}>
            Save contact
          </Button>
          <Button variant="secondary" onClick={onCancel} disabled={form.isLoading}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
};
