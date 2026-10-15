import { classNames } from "@/lib/class-names";

type SpinnerProps = {
  label?: string;
  size?: "sm" | "md";
};

export const Spinner = ({ label = "Loading", size = "md" }: SpinnerProps) => {
  return (
    <span role="status" className="inline-flex items-center">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className={classNames("animate-spin", size === "sm" ? "h-4 w-4" : "h-6 w-6")}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          className="opacity-25"
        />
        <path
          d="M22 12a10 10 0 0 0-10-10"
          stroke="currentColor"
          strokeWidth="4"
          className="opacity-75"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
};
