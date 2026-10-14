import { Skeleton } from "@/components/ui/Skeleton";

// Shown while the receipt page reads the session and the receipt on the server.
export default function ReceiptLoading() {
  return (
    <div role="status" aria-busy="true" className="mx-auto w-full max-w-xl">
      <span className="sr-only">Loading your receipt</span>
      <Skeleton className="mb-4 h-8 w-32" />
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
      </div>
    </div>
  );
}
