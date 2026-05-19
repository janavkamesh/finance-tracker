// Static decorative preview of the FinTrack dashboard — shown on auth pages
export function DashboardPreview() {
  return (
    <div className="relative w-full h-full flex flex-col justify-between p-8 overflow-hidden select-none">
      {/* Ambient blobs */}
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -left-10 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />

      {/* Top brand */}
      <div>
        <div className="flex items-center gap-2.5 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">FinTrack India</span>
        </div>
        <p className="text-white/60 text-sm leading-relaxed max-w-xs">
          Your complete personal finance dashboard — track spending, set goals, and grow your net worth.
        </p>
      </div>

      {/* Mock dashboard card */}
      <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 p-5 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Income", value: "₹50,000", color: "text-green-300" },
            { label: "Expenses", value: "₹12,400", color: "text-red-300" },
            { label: "Net", value: "+₹37,600", color: "text-white" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-white/10 px-3 py-2.5">
              <p className="text-[10px] text-white/50 mb-0.5">{s.label}</p>
              <p className={`text-sm font-bold tabular-nums ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Mini area chart (SVG) */}
        <div className="rounded-xl bg-white/5 p-3">
          <p className="text-[10px] text-white/40 mb-2">Income vs Expenses — this year</p>
          <svg viewBox="0 0 280 80" className="w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="ig" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4ade80" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f87171" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#f87171" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Income area */}
            <path
              d="M0,72 C20,68 35,55 55,42 C75,29 90,18 115,15 C140,12 155,20 175,28 C195,36 210,30 235,25 C255,21 270,22 280,20 L280,80 L0,80 Z"
              fill="url(#ig)"
            />
            <path
              d="M0,72 C20,68 35,55 55,42 C75,29 90,18 115,15 C140,12 155,20 175,28 C195,36 210,30 235,25 C255,21 270,22 280,20"
              fill="none" stroke="#4ade80" strokeWidth="1.5"
            />
            {/* Expense area */}
            <path
              d="M0,78 C20,76 35,72 55,68 C75,64 90,60 115,58 C140,56 155,55 175,57 C195,59 210,56 235,54 C255,52 270,53 280,52 L280,80 L0,80 Z"
              fill="url(#eg)"
            />
            <path
              d="M0,78 C20,76 35,72 55,68 C75,64 90,60 115,58 C140,56 155,55 175,57 C195,59 210,56 235,54 C255,52 270,53 280,52"
              fill="none" stroke="#f87171" strokeWidth="1.5"
            />
          </svg>
        </div>

        {/* Category bars */}
        <div className="space-y-2">
          {[
            { name: "Food & Dining", pct: 72, color: "#fbbf24" },
            { name: "Rent & Housing", pct: 55, color: "#60a5fa" },
            { name: "Transport", pct: 30, color: "#a78bfa" },
          ].map((cat) => (
            <div key={cat.name}>
              <div className="flex justify-between text-[10px] text-white/50 mb-1">
                <span>{cat.name}</span>
                <span>{cat.pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: `${cat.pct}%`, backgroundColor: cat.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom quote */}
      <div>
        <p className="text-white/40 text-xs italic">
          &ldquo;Track every rupee. Build lasting wealth.&rdquo;
        </p>
      </div>
    </div>
  );
}
