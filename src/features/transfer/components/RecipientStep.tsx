"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ListScenario } from "@/domain/api";
import { groupContacts } from "@/domain/contacts";
import { TRANSFER_ERROR_MESSAGES } from "@/domain/transfer-rules";
import type { Cents, Contact } from "@/domain/types";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  goToStep,
  selectRecipient,
  selectTransferValidation,
  setRecipient,
} from "@/store/slices/transferSlice";
import { useContacts } from "../hooks/useContacts";
import { ContactGroup } from "./ContactGroup";

// The form is only needed when the user taps "New contact", so its code is loaded on demand
// instead of being part of the first download of this step.
const NewContactForm = dynamic(
  () => import("./NewContactForm").then((module) => module.NewContactForm),
  { loading: () => <Skeleton className="h-72 w-full" /> },
);

type RecipientStepProps = {
  balanceCents: Cents;
  scenario?: ListScenario | undefined;
};

const SKELETON_ROWS = 4;
// How long the user must stop typing before the search request is sent.
export const SEARCH_DEBOUNCE_MS = 300;

export function RecipientStep({ balanceCents, scenario }: RecipientStepProps) {
  const dispatch = useAppDispatch();
  const recipient = useAppSelector(selectRecipient);
  const validation = useAppSelector((state) => selectTransferValidation(state, balanceCents));

  // `query` is what the input shows (updated on every key); `debouncedQuery` is what is searched.
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const { items, isLoading, isLoadingMore, error, loadMoreError, hasMore, loadMore, refetch } =
    useContacts(debouncedQuery, scenario);

  const [showForm, setShowForm] = useState(false);
  const [attempted, setAttempted] = useState(false);
  // The store only keeps the recipient name (what the API receives), and two contacts can share a
  // name, so the chosen contact is tracked by id here. Coming back to this step, the first
  // contact with the stored name is shown as selected.
  const [chosenId, setChosenId] = useState<string | null>(null);

  // The server already sorted favorites first; this only splits the list in two groups. useMemo
  // keeps the same arrays between renders, which lets the memoized groups skip re-rendering.
  const groups = useMemo(() => groupContacts(items), [items]);

  const isSearching = query.trim() !== debouncedQuery.trim() || isLoading;
  const recipientMissing = !validation.ok && validation.error.includes("RECIPIENT_REQUIRED");
  const selectedId =
    chosenId ?? (recipient === "" ? null : (items.find((c) => c.name === recipient)?.id ?? null));

  // useCallback: ContactOption is memoized and receives this function; a new one on every render
  // would make every option re-render each time.
  const handleSelect = useCallback(
    (contact: Contact) => {
      setChosenId(contact.id);
      dispatch(setRecipient(contact.name));
    },
    [dispatch],
  );

  const handleCreated = useCallback(
    (contact: Contact) => {
      setChosenId(contact.id);
      dispatch(setRecipient(contact.name));
      refetch();
      setShowForm(false);
    },
    [dispatch, refetch],
  );

  const handleCancelForm = useCallback(() => setShowForm(false), []);

  function handleContinue() {
    setAttempted(true);
    if (recipientMissing) return;
    dispatch(goToStep("summary"));
  }

  function renderContacts() {
    if (isLoading && items.length === 0) {
      return (
        <div role="status" className="flex flex-col gap-2">
          <span className="sr-only">Loading contacts</span>
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      );
    }
    if (error) {
      return (
        <ErrorState
          title="We couldn't load your contacts"
          message={error.message}
          onRetry={refetch}
        />
      );
    }
    if (items.length === 0) {
      if (isLoading) return null;
      return debouncedQuery.trim() === "" ? (
        <EmptyState
          title="No contacts yet"
          description="Add a new contact to send your first transfer."
        />
      ) : (
        <p className="py-4 text-center text-zinc-600">
          No contacts match “{debouncedQuery.trim()}”.
        </p>
      );
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
        {loadMoreError && (
          <p role="alert" className="text-sm text-red-700">
            {loadMoreError.message}
          </p>
        )}
        {hasMore && (
          <Button variant="secondary" loading={isLoadingMore} onClick={loadMore}>
            Load more
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-zinc-900">Who is receiving it?</h2>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label="Search contacts"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
          />
        </div>
        {/* Far from "Continue" on purpose, so the two buttons are never mixed up. */}
        <Button
          variant="secondary"
          aria-label="New contact"
          title="New contact"
          aria-expanded={showForm}
          onClick={() => setShowForm((open) => !open)}
          className="w-11 px-0 text-xl"
        >
          <span aria-hidden="true">+</span>
        </Button>
      </div>
      <p aria-live="polite" className="-mt-2 min-h-5 text-sm text-zinc-600">
        {isSearching ? "Searching…" : ""}
      </p>

      {showForm && <NewContactForm onCreated={handleCreated} onCancel={handleCancelForm} />}

      {renderContacts()}

      {/* Sticky: Continue stays visible however long the contact list is. */}
      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-zinc-200 bg-white px-4 py-3">
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
    </div>
  );
}
