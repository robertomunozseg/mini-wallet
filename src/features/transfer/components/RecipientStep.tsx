"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { groupContacts } from "@/domain/contacts";
import { TRANSFER_ERROR_MESSAGES } from "@/domain/transfer-rules";
import type { Cents, Contact } from "@/domain/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  goToStep,
  selectRecipient,
  selectTransferValidation,
  setRecipient,
} from "@/store/slices/transferSlice";
import { useContacts } from "../hooks/useContacts";
import { ContactGroup } from "./ContactGroup";
import { NewContactForm } from "./NewContactForm";

type RecipientStepProps = { balanceCents: Cents };

const SKELETON_ROWS = 4;

export function RecipientStep({ balanceCents }: RecipientStepProps) {
  const dispatch = useAppDispatch();
  const recipient = useAppSelector(selectRecipient);
  const validation = useAppSelector((state) => selectTransferValidation(state, balanceCents));
  const { contacts, isLoading, error, refetch } = useContacts();

  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [attempted, setAttempted] = useState(false);
  // The store only keeps the recipient name (what the API receives), and two contacts can share a
  // name, so the chosen contact is tracked by id here. Coming back to this step, the first
  // contact with the stored name is shown as selected.
  const [chosenId, setChosenId] = useState<string | null>(null);

  const groups = useMemo(() => groupContacts(contacts ?? [], query), [contacts, query]);
  const hasMatches = groups.favorites.length + groups.others.length > 0;

  const recipientMissing = !validation.ok && validation.error.includes("RECIPIENT_REQUIRED");
  const selectedId =
    chosenId ??
    (recipient === "" ? null : (contacts?.find((c) => c.name === recipient)?.id ?? null));

  function handleSelect(contact: Contact) {
    setChosenId(contact.id);
    dispatch(setRecipient(contact.name));
  }

  function handleCreated(contact: Contact) {
    setChosenId(contact.id);
    dispatch(setRecipient(contact.name));
    refetch();
    setShowForm(false);
  }

  function handleContinue() {
    setAttempted(true);
    if (recipientMissing) return;
    dispatch(goToStep("summary"));
  }

  function renderContacts() {
    if (contacts === null && isLoading) {
      return (
        <div role="status" className="flex flex-col gap-2">
          <span className="sr-only">Loading contacts</span>
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      );
    }
    if (contacts === null && error) {
      return (
        <ErrorState
          title="We couldn't load your contacts"
          message={error.message}
          onRetry={refetch}
        />
      );
    }
    if (!contacts || contacts.length === 0) {
      return (
        <EmptyState
          title="No contacts yet"
          description="Add a new contact to send your first transfer."
        />
      );
    }
    if (!hasMatches) {
      return <p className="py-4 text-center text-zinc-600">No contacts match “{query.trim()}”.</p>;
    }
    return (
      <div className="flex flex-col gap-4">
        <ContactGroup
          title="Favorites"
          contacts={groups.favorites}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
        <ContactGroup
          title="All contacts"
          contacts={groups.others}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-zinc-900">Who is receiving it?</h2>

      <Input
        label="Search contacts"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        autoComplete="off"
      />

      {renderContacts()}

      {showForm ? (
        <NewContactForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />
      ) : (
        <Button variant="secondary" onClick={() => setShowForm(true)}>
          New contact
        </Button>
      )}

      <p aria-live="polite" className="text-sm text-zinc-600">
        {recipient.trim() !== "" && (
          <>
            Sending to: <span className="font-semibold text-zinc-900">{recipient}</span>
          </>
        )}
      </p>
      {attempted && recipientMissing && (
        <p role="alert" className="text-sm text-red-700">
          {TRANSFER_ERROR_MESSAGES.RECIPIENT_REQUIRED}
        </p>
      )}

      <Button onClick={handleContinue}>Continue</Button>
    </div>
  );
}
