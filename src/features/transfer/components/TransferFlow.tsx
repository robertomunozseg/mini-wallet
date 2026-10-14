"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { ListScenario } from "@/domain/api";
import type { Cents } from "@/domain/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { goToStep, reset, selectTransferStep } from "@/store/slices/transferSlice";
import type { TransferStep } from "@/store/slices/transferSlice";
import { AmountStep } from "./AmountStep";
import { RecipientStep } from "./RecipientStep";
import { StepIndicator } from "./StepIndicator";
import { useConfirmTransfer } from "../hooks/useConfirmTransfer";
import { ConfirmationResult } from "./ConfirmationResult";
import { SummaryStep } from "./SummaryStep";

type TransferFlowProps = {
  balanceCents: Cents;
  // ?scenario=large in the URL: search a big generated address book (see ListScenario).
  scenario?: ListScenario | undefined;
};

const STEP_LABELS = ["Amount", "Recipient", "Summary"] as const;

// Which indicator step each store step belongs to (confirming belongs to the summary).
const INDICATOR_INDEX: Record<TransferStep, number> = {
  amount: 0,
  recipient: 1,
  summary: 2,
  confirming: 2,
};

// The step "Back" goes to. The first step leaves the flow instead.
const PREVIOUS_STEP: Record<TransferStep, TransferStep | null> = {
  amount: null,
  recipient: "amount",
  summary: "recipient",
  confirming: "summary",
};

export function TransferFlow({ balanceCents, scenario }: TransferFlowProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const step = useAppSelector(selectTransferStep);
  const { state: confirmState, confirm, retry } = useConfirmTransfer();
  // Going back while the request is in flight would hide a transfer that is still being made.
  const isSending = confirmState.status === "processing" || confirmState.status === "success";
  const [flowId, setFlowId] = useState(0);

  // Leaving the flow (Back from the first step, another link, browser back) clears the draft.
  // With Cache Components Next keeps the hidden page alive with its local state (typed text,
  // open forms), so changing the key also remounts the steps and they start from scratch.
  useEffect(() => {
    return () => {
      dispatch(reset());
      setFlowId((id) => id + 1);
    };
  }, [dispatch]);

  function handleBack() {
    const previous = PREVIOUS_STEP[step];
    if (previous === null) {
      router.push("/home");
      return;
    }
    dispatch(goToStep(previous));
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div>
        <Button variant="ghost" onClick={handleBack} disabled={isSending} className="-ml-4">
          ← Back
        </Button>
      </div>

      <StepIndicator steps={STEP_LABELS} currentIndex={INDICATOR_INDEX[step]} />

      <div key={flowId}>
        {step === "amount" && <AmountStep balanceCents={balanceCents} />}
        {step === "recipient" && <RecipientStep balanceCents={balanceCents} scenario={scenario} />}
        {step === "summary" && <SummaryStep balanceCents={balanceCents} onConfirm={confirm} />}
        {step === "confirming" && <ConfirmationResult state={confirmState} onRetry={retry} />}
      </div>
    </div>
  );
}
