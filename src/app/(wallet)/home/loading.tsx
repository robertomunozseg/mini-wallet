import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function HomeLoading() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Loading your home</span>
      <Skeleton className="mb-4 h-8 w-24" />
      <div className="grid gap-6 md:grid-cols-[2fr_3fr] md:items-start">
        <Card className="space-y-4">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-11 w-full sm:w-40" />
        </Card>
        <Card className="space-y-4">
          <Skeleton className="h-6 w-1/3" />
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </Card>
      </div>
    </div>
  );
}
