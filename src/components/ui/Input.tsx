import { useId, type InputHTMLAttributes } from "react";
import { classNames } from "@/lib/class-names";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  error?: string;
};

export const Input = ({ label, error, className, ...rest }: InputProps) => {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-zinc-800">
        {label}
      </label>
      <input
        {...rest}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={classNames(
          "min-h-11 w-full rounded-lg border bg-white px-3 py-2 text-base text-zinc-900",
          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600",
          error ? "border-red-600" : "border-zinc-300",
          className,
        )}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
};
