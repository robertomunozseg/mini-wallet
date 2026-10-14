"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import type { TransferValidationError } from "@/domain/errors";
import { centsToInput, toCents } from "@/domain/money";
import { TRANSFER_ERROR_MESSAGES } from "@/domain/transfer-rules";
import type { Cents } from "@/domain/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  goToStep,
  selectAmountCents,
  selectTransferValidation,
  setAmount,
} from "@/store/slices/transferSlice";

// The amount step only reports the amount rules; the recipient rule belongs to the next step.
const AMOUNT_RULES: TransferValidationError[] = [
  "AMOUNT_REQUIRED",
  "AMOUNT_NOT_POSITIVE",
  "INSUFFICIENT_BALANCE",
];

export function useAmountStep(balanceCents: Cents) {
  const dispatch = useAppDispatch();
  const amountCents = useAppSelector(selectAmountCents);
  const validation = useAppSelector((state) => selectTransferValidation(state, balanceCents));

  // The typed text stays local (it can be invalid while typing); the store keeps the parsed value.
  const [text, setText] = useState(() => (amountCents === null ? "" : centsToInput(amountCents)));
  const [touched, setTouched] = useState(false);

  const amountError = validation.ok
    ? undefined
    : validation.error.find((rule) => AMOUNT_RULES.includes(rule));

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    setText(event.target.value);
    dispatch(setAmount(toCents(event.target.value)));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (amountError) return;
    dispatch(goToStep("recipient"));
  }

  return {
    text,
    error: touched && amountError ? TRANSFER_ERROR_MESSAGES[amountError] : undefined,
    onChange,
    onBlur: () => setTouched(true),
    onSubmit,
  };
}
