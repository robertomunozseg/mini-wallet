import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { formatMoney } from "@/domain/money";
import type { Receipt } from "@/domain/types";

type ReceiptViewProps = { receipt: Receipt };

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Mexico_City",
});

export function ReceiptView({ receipt }: ReceiptViewProps) {
  const { transaction, newBalanceCents } = receipt;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p role="status" className="mb-4 font-medium text-green-800">
          Transfer completed
        </p>
        <dl className="flex flex-col gap-3">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-600">Reference</dt>
            <dd className="break-all text-right font-mono text-sm text-zinc-900">
              {transaction.id}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-600">Date</dt>
            <dd className="text-right text-zinc-900">
              {dateFormatter.format(new Date(transaction.createdAt))}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-600">Amount</dt>
            <dd className="font-semibold text-zinc-900">{formatMoney(transaction.amountCents)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-600">To</dt>
            <dd className="font-semibold text-zinc-900">{transaction.recipient}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-zinc-100 pt-3">
            <dt className="text-zinc-600">New balance</dt>
            <dd className="font-semibold text-zinc-900">{formatMoney(newBalanceCents)}</dd>
          </div>
        </dl>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        <ButtonLink href="/home">Back to home</ButtonLink>
        <ButtonLink href="/transfer" variant="secondary">
          New transfer
        </ButtonLink>
      </div>
    </div>
  );
}
