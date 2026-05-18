"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatINR } from "@/lib/utils";

export interface CategorySlice {
  name: string;
  value: number;
  color: string;
}

const FALLBACK_COLORS = [
  "#1E6B4E",
  "#DC2626",
  "#D97706",
  "#2563EB",
  "#7C3AED",
  "#DB2777",
  "#059669",
  "#ea580c",
];

export function CategoryPieChart({ data }: { data: CategorySlice[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-center">
        <svg className="w-8 h-8 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
        </svg>
        <p className="text-sm font-medium text-gray-400">Where your money went</p>
        <p className="text-xs text-gray-300">Log an expense to see your category breakdown</p>
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col gap-4">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={entry.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => value != null ? formatINR(Number(value)) : ""}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              fontSize: 13,
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <ul className="space-y-2">
        {data.map((item, i) => (
          <li key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    item.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
                }}
              />
              <span className="truncate text-gray-700">{item.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-gray-400 text-xs">
                {((item.value / total) * 100).toFixed(0)}%
              </span>
              <span className="font-medium tabular-nums text-gray-900">
                {formatINR(item.value)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
