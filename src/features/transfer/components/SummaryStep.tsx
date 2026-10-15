"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SCENARIOS } from "@/domain/api";
import { formatMoney, subtractCents } from "@/domain/money";
import { TRANSFER_ERROR_MESSAGES } from "@/domain/transfer-rules";
import type { Cents } from "@/domain/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectAmountCents,
  selectDemoScenario,
  selectRecipient,
  selectTransferValidation,
  setDemoScenario,
  type DemoScenario,
} from "@/store/slices/transferSlice";

// With NEXT_PUBLIC_DEMO_MODE=true the summary shows a selector to force a scenario.
// A function, so the variable is read when the component renders (tests change it).
const isDemoMode = () => process.env.NEXT_PUBLIC_DEMO_MODE === "true";

type SummaryStepProps = {
  balanceCents: Cents;
  onConfirm: () => void;
};

const DEMO_OPTIONS: readonly DemoScenario[] = ["random", ...SCENARIOS];

function isDemoScenario(value: string): value is DemoScenario {
  return DEMO_OPTIONS.some((option) => option === value);
}

export function SummaryStep({ balanceCents, onConfirm }: SummaryStepProps) {
  const dispatch = useAppDispatch();
  const amountCents = useAppSelector(selectAmountCents);
  const recipient = useAppSelector(selectRecipient);
  const demoScenario = useAppSelector(selectDemoScenario);
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

      {isDemoMode() && (
        <div className="flex flex-col gap-1">
          <label htmlFor="demo-scenario" className="text-sm font-medium text-zinc-800">
            Simulated scenario
          </label>
          <select
            id="demo-scenario"
            value={demoScenario}
            onChange={(event) => {
              if (isDemoScenario(event.target.value)) {
                dispatch(setDemoScenario(event.target.value));
              }
            }}
            className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
          >
            {DEMO_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "random" ? "Random (default)" : option}
              </option>
            ))}
          </select>
        </div>
      )}

      <Button disabled={!validation.ok} onClick={onConfirm}>
        Confirm
      </Button>
    </div>
  );
}
