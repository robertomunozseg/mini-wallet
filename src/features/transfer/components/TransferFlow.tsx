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

export const TransferFlow = ({ balanceCents, scenario }: TransferFlowProps) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const step = useAppSelector(selectTransferStep);
  const { state: confirmState, confirm, retry, reset: resetConfirm } = useConfirmTransfer();
  // Going back while the request is in flight would hide a transfer that is still being made.
  const isSending = confirmState.status === "processing" || confirmState.status === "success";
  const [flowId, setFlowId] = useState(0);

  // Leaving the flow (Back, another link, the browser back button) clears the draft. Next keeps
  // the hidden page alive with its state, so the confirmation state is reset too and the new key
  // remounts the steps: the next transfer starts clean, with Back enabled.
  useEffect(() => {
    return () => {
      dispatch(reset());
      resetConfirm();
      setFlowId((id) => id + 1);
    };
  }, [dispatch, resetConfirm]);

  const onBack = () => {
    const previous = PREVIOUS_STEP[step];
    if (previous === null) {
      router.push("/home");
      return;
    }
    dispatch(goToStep(previous));
  };

  return (
    // The flow is as tall as what is left of the window (--wallet-chrome in globals.css), so a
    // long contact list scrolls inside itself, not the page. Below 30rem the page scrolls.
    <div className="mx-auto flex h-[calc(100dvh-var(--wallet-chrome))] max-h-[50rem] min-h-[30rem] w-full max-w-xl flex-col gap-6 short:gap-3">
      <div>
        <Button variant="ghost" onClick={onBack} disabled={isSending} className="-ml-4">
          ← Back
        </Button>
      </div>

      <StepIndicator steps={STEP_LABELS} currentIndex={INDICATOR_INDEX[step]} />

      <div key={flowId} className="flex min-h-0 flex-1 flex-col">
        {step === "amount" && <AmountStep balanceCents={balanceCents} />}
        {step === "recipient" && <RecipientStep balanceCents={balanceCents} scenario={scenario} />}
        {step === "summary" && <SummaryStep balanceCents={balanceCents} onConfirm={confirm} />}
        {step === "confirming" && <ConfirmationResult state={confirmState} onRetry={retry} />}
      </div>
    </div>
  );
};
