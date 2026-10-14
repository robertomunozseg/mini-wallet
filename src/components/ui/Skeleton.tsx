import { classNames } from "@/lib/class-names";

type SkeletonProps = {
  className?: string;
};

// Decorative placeholder: the screen that uses it should announce loading (e.g. with Spinner).
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={classNames("animate-pulse rounded-md bg-zinc-200", className ?? "h-4 w-full")}
    />
  );
}
