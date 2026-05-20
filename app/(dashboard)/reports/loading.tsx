import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <main className="p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-7 w-24" />
        <div className="flex items-center gap-1">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-100 bg-white p-4">
            <Skeleton className="h-3 w-24 mb-2" />
            <Skeleton className="h-6 w-28" />
          </div>
        ))}
      </div>

      {/* Area chart */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 mb-5">
        <Skeleton className="h-4 w-48 mb-4" />
        <Skeleton className="h-[280px] w-full" />
      </div>

      {/* Bottom two columns */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5">
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <Skeleton className="h-4 w-44 mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-2.5 w-2.5 rounded-full" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
