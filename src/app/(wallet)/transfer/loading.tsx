import { Skeleton } from "@/components/ui/Skeleton";

// Shown while the transfer page reads the session and the balance on the server.
export default function TransferLoading() {
  return (
    <div role="status" aria-busy="true" className="mx-auto w-full max-w-xl">
      <span className="sr-only">Loading the transfer form</span>
      <Skeleton className="mb-4 h-8 w-40" />
      <Skeleton className="mb-6 h-7 w-full" />
      <div className="space-y-4">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  );
}
