import { Button } from "./Button";

type ErrorStateProps = {
  message: string;
  title?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export const ErrorState = ({
  message,
  title = "Something went wrong",
  onRetry,
  retryLabel = "Try again",
}: ErrorStateProps) => {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <p className="text-lg font-semibold text-red-800">{title}</p>
      <p className="max-w-sm text-sm text-zinc-700">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="mt-2">
          {retryLabel}
        </Button>
      )}
    </div>
  );
};
