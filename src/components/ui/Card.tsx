import type { HTMLAttributes } from "react";
import { classNames } from "@/lib/class-names";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={classNames(
        "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6",
        className,
      )}
    />
  );
}
