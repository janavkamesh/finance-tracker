export default function GoalsLoading() {
  return (
    <main className="p-6 md:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-6 w-32 rounded-md bg-gray-100 animate-pulse" />
          <div className="h-4 w-48 rounded-md bg-gray-100 animate-pulse" />
        </div>
        <div className="h-9 w-28 rounded-lg bg-gray-100 animate-pulse" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-gray-200 animate-pulse" />
                <div className="space-y-1.5">
                  <div className="h-4 w-36 rounded-md bg-gray-100 animate-pulse" />
                  <div className="h-3 w-24 rounded-md bg-gray-100 animate-pulse" />
                </div>
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100 animate-pulse" />
            <div className="flex justify-between">
              <div className="h-3 w-40 rounded-md bg-gray-100 animate-pulse" />
              <div className="h-7 w-24 rounded-lg bg-gray-100 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
