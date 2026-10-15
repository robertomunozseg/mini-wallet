"use client";

import { useCallback, useMemo, useState } from "react";
import type { ListScenario } from "@/domain/api";
import { groupContacts } from "@/domain/contacts";
import type { Cents, Contact } from "@/domain/types";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  goToStep,
  selectRecipient,
  selectTransferValidation,
  setRecipient,
} from "@/store/slices/transferSlice";
import { useContacts } from "./useContacts";

// How long the user must stop typing before the search request is sent.
export const SEARCH_DEBOUNCE_MS = 300;

// State and actions of the recipient step: search, contact selection, the "new contact" form and
// Continue. RecipientStep only renders what this hook returns.
export function useRecipientStep(balanceCents: Cents, scenario?: ListScenario) {
  const dispatch = useAppDispatch();
  const recipient = useAppSelector(selectRecipient);
  const validation = useAppSelector((state) => selectTransferValidation(state, balanceCents));

  // `query` is what the input shows (updated on every key); `debouncedQuery` is what is searched.
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const contacts = useContacts(debouncedQuery, scenario);
  const { items, isLoading, refetch } = contacts;

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

  const toggleForm = useCallback(() => setShowForm((open) => !open), []);
  const closeForm = useCallback(() => setShowForm(false), []);

  function handleContinue() {
    setAttempted(true);
    if (recipientMissing) return;
    dispatch(goToStep("summary"));
  }

  return {
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
  };
}
