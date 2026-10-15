"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ListScenario } from "@/domain/api";
import { TRANSFER_ERROR_MESSAGES } from "@/domain/transfer-rules";
import type { Cents } from "@/domain/types";
import { useRecipientStep } from "../hooks/useRecipientStep";
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

export function RecipientStep({ balanceCents, scenario }: RecipientStepProps) {
  const {
    query,
    setQuery,
    debouncedQuery,
    isSearching,
    contacts,
    groups,
    selectedId,
    recipient,
    recipientMissing,
    attempted,
    showForm,
    toggleForm,
    closeForm,
    handleSelect,
    handleCreated,
    handleContinue,
  } = useRecipientStep(balanceCents, scenario);
  const { items, isLoading, isLoadingMore, error, loadMoreError, hasMore, loadMore, refetch } =
    contacts;

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
          onClick={toggleForm}
          className="w-11 px-0 text-xl"
        >
          <span aria-hidden="true">+</span>
        </Button>
      </div>
      <p aria-live="polite" className="-mt-2 min-h-5 text-sm text-zinc-600">
        {isSearching ? "Searching…" : ""}
      </p>

      {/* Only this area scrolls, so the page itself does not: its height is what is left of the
          window after the header, the steps and the search box above and the Continue bar below. */}
      <div
        role="region"
        aria-label="Contacts"
        className="flex max-h-[max(12rem,calc(100dvh-34rem))] flex-col gap-4 overflow-y-auto"
      >
        {showForm && <NewContactForm onCreated={handleCreated} onCancel={closeForm} />}

        {renderContacts()}
      </div>

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

        <Button onClick={handleContinue} incomplete={recipientMissing}>
          Continue
        </Button>
      </div>
    </div>
  );
}
