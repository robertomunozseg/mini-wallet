import type { ButtonHTMLAttributes } from "react";
import { classNames } from "@/lib/class-names";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

// ready: normal. loading: normal colors, faded. inactive: grey (disabled or incomplete).
type ButtonState = "ready" | "loading" | "inactive";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  // The form is not valid yet: it looks disabled but can still be pressed, so the errors show.
  incomplete?: boolean;
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary:
    "border border-zinc-300 bg-white text-zinc-900 hover:border-blue-600 hover:bg-blue-50 hover:text-blue-700",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "bg-transparent text-blue-700 hover:bg-blue-50",
};

const INACTIVE_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-zinc-200 text-zinc-500",
  secondary: "border border-zinc-200 bg-zinc-100 text-zinc-500",
  danger: "bg-zinc-200 text-zinc-500",
  ghost: "bg-transparent text-zinc-400",
};

// ButtonLink uses it too, so a link can look like a button.
export const buttonClassName = (
  variant: ButtonVariant,
  className?: string,
  state: ButtonState = "ready",
) =>
  classNames(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-base font-medium transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
    "disabled:cursor-not-allowed",
    state === "inactive" ? INACTIVE_CLASSES[variant] : VARIANT_CLASSES[variant],
    state === "loading" && "opacity-60",
    className,
  );

export const Button = ({
  variant = "primary",
  loading = false,
  incomplete = false,
  disabled,
  type = "button",
  className,
  children,
  ...rest
}: ButtonProps) => {
  const state = loading ? "loading" : disabled || incomplete ? "inactive" : "ready";

  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading}
      aria-disabled={incomplete && !disabled && !loading ? true : undefined}
      className={buttonClassName(variant, className, state)}
    >
      {loading && (
        <span aria-hidden="true">
          <Spinner size="sm" />
        </span>
      )}
      {children}
    </button>
  );
};
