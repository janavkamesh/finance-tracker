import { Skeleton } from "@/components/ui/skeleton";

export default function TransactionsLoading() {
  return (
    <main className="p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-7 w-32 mb-2" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-100 bg-white px-4 py-3">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Skeleton className="h-9 w-52 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* Transaction list */}
      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-5 py-4 border-b last:border-0 border-gray-100 dark:border-white/5"
          >
            <Skeleton className="h-2 w-2 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-44" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </main>
  );
}
