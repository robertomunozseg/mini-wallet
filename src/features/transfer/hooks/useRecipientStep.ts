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
export const useRecipientStep = (balanceCents: Cents, scenario?: ListScenario) => {
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
  // The store only keeps the name (that is what the API gets) and two contacts can share it, so
  // the chosen one is tracked by id here.
  const [chosenId, setChosenId] = useState<string | null>(null);

  // The server already sorted favorites first; this only splits them. useMemo keeps the same
  // arrays so the memoized groups can skip re-rendering.
  const groups = useMemo(() => groupContacts(items), [items]);

  const isSearching = query.trim() !== debouncedQuery.trim() || isLoading;
  const recipientMissing = !validation.ok && validation.error.includes("RECIPIENT_REQUIRED");
  const selectedId =
    chosenId ?? (recipient === "" ? null : (items.find((c) => c.name === recipient)?.id ?? null));

  // useCallback: ContactOption is memoized, and a new function on every render would make every
  // option re-render.
  const onSelect = useCallback(
    (contact: Contact) => {
      setChosenId(contact.id);
      dispatch(setRecipient(contact.name));
    },
    [dispatch],
  );

  const onCreated = useCallback(
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

  const onContinue = () => {
    setAttempted(true);
    if (recipientMissing) return;
    dispatch(goToStep("summary"));
  };

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
    onSelect,
    onCreated,
    onContinue,
  };
};
