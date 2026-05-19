"use client";

import { useEffect, useState } from "react";
import { Shield, Laptop, Plane, Target } from "lucide-react";
import { formatINR } from "@/lib/utils";

// Mock goals mapped to icons and colors
const DEFAULT_GOALS = [
  { id: "1", title: "Emergency Fund", target: 50000, icon: Shield, color: "bg-emerald-500" },
  { id: "2", title: "New Laptop", target: 80000, icon: Laptop, color: "bg-blue-500" },
  { id: "3", title: "Vacation", target: 30000, icon: Plane, color: "bg-purple-500" },
];

export function ActiveGoalsWidget({ transactions }: { transactions: any[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Slight delay to ensure the CSS transition triggers after render
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Calculate net savings from the provided transactions
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  
  const netSaved = Math.max(0, totalIncome - totalExpense);

  // Allocate net savings to goals (Waterfall distribution)
  let remainingSavings = netSaved;
  const goalsWithProgress = DEFAULT_GOALS.map((goal) => {
    const allocated = Math.min(remainingSavings, goal.target);
    remainingSavings = Math.max(0, remainingSavings - allocated);
    const percentage = Math.round((allocated / goal.target) * 100);
    return { ...goal, allocated, percentage };
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mt-6 flex flex-col gap-5">
      <div className="flex items-center gap-2 mb-1">
        <Target className="w-5 h-5 text-indigo-600" />
        <h2 className="text-base font-bold text-gray-900">Active Goals</h2>
      </div>

      <div className="flex flex-col gap-6">
        {goalsWithProgress.map((goal) => {
          const Icon = goal.icon;
          return (
            <div key={goal.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-gray-50 border border-gray-100">
                    <Icon className="w-4 h-4 text-gray-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{goal.title}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{goal.percentage}%</span>
              </div>
              
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${goal.color}`}
                  style={{ width: mounted ? `${goal.percentage}%` : '0%' }}
                />
              </div>
              
              <p className="text-xs text-gray-500 font-medium tracking-wide">
                {formatINR(goal.allocated)} <span className="text-gray-400 font-normal">of {formatINR(goal.target)} saved</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
