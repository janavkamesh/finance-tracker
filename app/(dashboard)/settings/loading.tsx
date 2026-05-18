import { Skeleton } from "@/components/ui/skeleton";

function SectionSkeleton({ rows = 1 }: { rows?: number }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6">
      <Skeleton className="h-4 w-24 mb-1.5" />
      <Skeleton className="h-3 w-56 mb-5" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-64 rounded-lg" />
        ))}
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
    </section>
  );
}

export default function SettingsLoading() {
  return (
    <main className="p-6 md:p-8 max-w-3xl space-y-6">
      <Skeleton className="h-7 w-24" />
      <SectionSkeleton />
      <SectionSkeleton />
      <SectionSkeleton />

      {/* Categories section */}
      <section className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <div>
            <Skeleton className="h-4 w-32 mb-1.5" />
            <Skeleton className="h-3 w-52" />
          </div>
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-6 py-3.5">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-4 flex-1 max-w-[160px]" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
