import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <main className="p-6 md:p-8">
      <div className="mb-6">
        <Skeleton className="h-7 w-28 mb-2" />
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-100 bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-3 w-14" />
            </div>
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-6">
        <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-5">
          <Skeleton className="h-4 w-28 mb-4" />
          <Skeleton className="h-[280px] w-full" />
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <Skeleton className="h-4 w-40 mb-4" />
          <Skeleton className="h-[200px] w-full rounded-full mx-auto max-w-[200px]" />
          <div className="mt-4 space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-2.5 w-2.5 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="rounded-2xl border border-gray-100 bg-white">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-14" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-5 py-4 border-b last:border-0 border-gray-50"
          >
            <Skeleton className="h-2 w-2 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </main>
  );
}
