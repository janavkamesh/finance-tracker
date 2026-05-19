"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Slice {
  name: string;
  value: number;
  color: string;
}

function formatK(value: number) {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(1)}Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(0)}K`;
  return `₹${value}`;
}

export function NetWorthChart({ assets, liabilities }: { assets: Slice[]; liabilities: Slice[] }) {
  const allSlices = [...assets, ...liabilities];
  if (allSlices.length === 0 || allSlices.every((s) => s.value === 0)) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-gray-400">
        Add accounts to see the breakdown
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={allSlices}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          dataKey="value"
        >
          {allSlices.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) =>
            value != null
              ? new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 0,
                }).format(Number(value))
              : ""
          }
          contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(value) => value}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
