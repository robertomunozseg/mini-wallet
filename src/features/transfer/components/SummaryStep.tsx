"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatMoney, subtractCents } from "@/domain/money";
import { TRANSFER_ERROR_MESSAGES } from "@/domain/transfer-rules";
import type { Cents } from "@/domain/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectAmountCents,
  selectRecipient,
  selectTransferValidation,
  startConfirm,
} from "@/store/slices/transferSlice";

type SummaryStepProps = { balanceCents: Cents };

export function SummaryStep({ balanceCents }: SummaryStepProps) {
  const dispatch = useAppDispatch();
  const amountCents = useAppSelector(selectAmountCents);
  const recipient = useAppSelector(selectRecipient);
  const validation = useAppSelector((state) => selectTransferValidation(state, balanceCents));

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-zinc-900">Review your transfer</h2>

      <Card>
        <dl className="flex flex-col gap-3">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-600">Amount</dt>
            <dd className="font-semibold text-zinc-900">
              {amountCents === null ? "—" : formatMoney(amountCents)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-600">To</dt>
            <dd className="font-semibold text-zinc-900">{recipient.trim() || "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-zinc-100 pt-3">
            <dt className="text-zinc-600">Balance after transfer</dt>
            <dd className="font-semibold text-zinc-900">
              {validation.ok
                ? formatMoney(subtractCents(balanceCents, validation.value.amountCents))
                : "—"}
            </dd>
          </div>
        </dl>
      </Card>

      {!validation.ok && (
        <ul role="alert" className="list-disc pl-5 text-sm text-red-700">
          {validation.error.map((rule) => (
            <li key={rule}>{TRANSFER_ERROR_MESSAGES[rule]}</li>
          ))}
        </ul>
      )}

      <Button disabled={!validation.ok} onClick={() => dispatch(startConfirm())}>
        Confirm
      </Button>
    </div>
  );
}
