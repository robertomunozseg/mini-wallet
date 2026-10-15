"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatMoney } from "@/domain/money";
import type { Cents } from "@/domain/types";
import { useAmountStep } from "../hooks/useAmountStep";

type AmountStepProps = { balanceCents: Cents };

export const AmountStep = ({ balanceCents }: AmountStepProps) => {
  const step = useAmountStep(balanceCents);

  return (
    <form onSubmit={step.onSubmit} noValidate className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-zinc-900">How much do you want to send?</h2>
      <p className="text-sm text-zinc-600">
        Available balance:{" "}
        <span className="font-semibold text-zinc-900">{formatMoney(balanceCents)}</span>
      </p>
      <Input
        label="Amount (MXN)"
        name="amount"
        value={step.text}
        onChange={step.onChange}
        onBlur={step.onBlur}
        error={step.error}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
      />
      <Button type="submit" incomplete={!step.isComplete}>
        Continue
      </Button>
    </form>
  );
};
