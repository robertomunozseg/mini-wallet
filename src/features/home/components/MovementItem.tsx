import { formatMoney } from "@/domain/money";
import { formatRelativeTime } from "@/domain/relative-time";
import type { Movement, MovementStatus } from "@/domain/types";
import { classNames } from "@/lib/class-names";

type MovementItemProps = { movement: Movement };

const STATUS_LABELS: Record<Exclude<MovementStatus, "completed">, string> = {
  pending: "Pending",
  failed: "Failed",
};

export function MovementItem({ movement }: MovementItemProps) {
  const isIncoming = movement.type === "incoming";
  const isFailed = movement.status === "failed";
  const statusLabel = movement.status === "completed" ? null : STATUS_LABELS[movement.status];

  return (
    <li className="flex items-center gap-3 py-3">
      <span
        aria-hidden="true"
        className={classNames(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          isIncoming ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          {isIncoming ? (
            <path d="M17 7 7 17M7 17h8M7 17V9" />
          ) : (
            <path d="M7 17 17 7M17 7H9M17 7v8" />
          )}
        </svg>
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-zinc-900">
          <span className="sr-only">{isIncoming ? "Received from " : "Sent to "}</span>
          {movement.counterpartName}
        </p>
        <p className="text-sm text-zinc-600">
          <time dateTime={movement.createdAt}>{formatRelativeTime(movement.createdAt)}</time>
          {statusLabel && (
            <span
              className={classNames(
                "ml-2 rounded-full px-2 py-0.5 text-xs font-medium",
                isFailed ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900",
              )}
            >
              {statusLabel}
            </span>
          )}
        </p>
      </div>

      <p
        className={classNames(
          "shrink-0 font-semibold tabular-nums",
          isFailed ? "text-zinc-500 line-through" : isIncoming ? "text-green-700" : "text-red-700",
        )}
      >
        {isIncoming ? "+" : "-"}
        {formatMoney(movement.amountCents)}
      </p>
    </li>
  );
}
