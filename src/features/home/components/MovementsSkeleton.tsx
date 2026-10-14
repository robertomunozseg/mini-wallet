import { Skeleton } from "@/components/ui/Skeleton";

const SKELETON_ROWS = 5;

// Placeholder rows shown while the first page of movements loads.
export function MovementsSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Loading movements</span>
      <div className="divide-y divide-zinc-100">
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <div key={index} className="flex items-center gap-3 py-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
