import { classNames } from "@/lib/class-names";

type StepIndicatorProps = {
  steps: readonly string[];
  currentIndex: number;
};

export const StepIndicator = ({ steps, currentIndex }: StepIndicatorProps) => {
  return (
    <nav aria-label="Transfer progress">
      <ol className="flex items-center gap-2">
        {steps.map((label, index) => {
          const isCurrent = index === currentIndex;
          const isDone = index < currentIndex;
          return (
            <li
              key={label}
              aria-current={isCurrent ? "step" : undefined}
              className="flex flex-1 items-center gap-2"
            >
              <span
                aria-hidden="true"
                className={classNames(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  isCurrent || isDone ? "bg-blue-600 text-white" : "bg-zinc-200 text-zinc-700",
                )}
              >
                {isDone ? "✓" : index + 1}
              </span>
              <span
                className={classNames(
                  "text-sm",
                  isCurrent ? "font-semibold text-zinc-900" : "text-zinc-600",
                )}
              >
                <span className="sr-only">
                  Step {index + 1} of {steps.length}:{" "}
                </span>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
