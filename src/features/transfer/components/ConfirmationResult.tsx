"use client";

import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useAppDispatch } from "@/store/hooks";
import { editAmount } from "@/store/slices/transferSlice";
import type { ConfirmState } from "../hooks/useConfirmTransfer";

type ConfirmationResultProps = {
  state: ConfirmState;
  onRetry: () => void;
};

const TIMEOUT_MESSAGE =
  "The operation took too long. It may have been processed: try again and you will not be charged twice.";

export const ConfirmationResult = ({ state, onRetry }: ConfirmationResultProps) => {
  const dispatch = useAppDispatch();

  if (state.status === "idle") return null;

  if (state.status === "processing") {
    return (
      <Card className="flex flex-col items-center gap-3 py-8 text-center">
        <Spinner label="Loading" />
        <p className="font-medium text-zinc-900">Processing…</p>
        {state.slow && (
          <p role="status" className="text-sm text-zinc-600">
            This is taking longer than usual
          </p>
        )}
      </Card>
    );
  }

  if (state.status === "success") {
    return (
      <Card className="flex flex-col items-center gap-3 py-8 text-center">
        <p role="status" className="font-medium text-zinc-900">
          Transfer completed. Opening your receipt…
        </p>
      </Card>
    );
  }

  const { code, message } = state.error;
  return (
    <Card className="flex flex-col gap-4">
      <div role="alert" className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-red-800">The transfer was not completed</h2>
        <p className="text-zinc-700">{code === "TIMEOUT" ? TIMEOUT_MESSAGE : message}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {(code === "NETWORK_ERROR" || code === "TIMEOUT") && (
          // Same Idempotency-Key as the first attempt.
          <Button onClick={onRetry}>Try again</Button>
        )}
        {code === "INSUFFICIENT_FUNDS" && (
          <Button onClick={() => dispatch(editAmount())}>Change amount</Button>
        )}
        {code !== "NETWORK_ERROR" && code !== "INSUFFICIENT_FUNDS" && (
          <ButtonLink href="/home" variant="secondary">
            Back to home
          </ButtonLink>
        )}
      </div>
    </Card>
  );
};
