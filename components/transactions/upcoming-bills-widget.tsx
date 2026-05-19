"use client";

import { formatINR } from "@/lib/utils";
import { CalendarClock, CheckCircle2, Home, Monitor, Zap } from "lucide-react";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";

const MOCK_BILLS = [
  { id: "1", name: "Rent", category: "Rent & Housing", amount: 25000, daysUntilDue: 2, icon: Home },
  { id: "2", name: "Adobe Creative Cloud", category: "Shopping", amount: 4230, daysUntilDue: 5, icon: Monitor },
  { id: "3", name: "Electricity Bill", category: "Bills & Recharge", amount: 1500, daysUntilDue: 10, icon: Zap },
];

export function UpcomingBillsWidget({ categories, activeMonth }: { categories: any[], activeMonth?: string }) {
  // Sort bills by urgency (closest due date first)
  const sortedBills = [...MOCK_BILLS].sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mt-6 flex flex-col gap-5">
      <div className="flex items-center gap-2 mb-1">
        <CalendarClock className="w-5 h-5 text-indigo-600" />
        <h2 className="text-base font-bold text-gray-900">Upcoming Bills</h2>
      </div>

      <div className="flex flex-col gap-5">
        {sortedBills.map((bill) => {
          const Icon = bill.icon;
          const isUrgent = bill.daysUntilDue <= 3;
          const isNeutral = bill.daysUntilDue > 5;
          
          let badgeClass = "bg-blue-50 text-blue-600 border-blue-100";
          if (isUrgent) badgeClass = "bg-orange-50 text-orange-600 border-orange-100";
          if (isNeutral) badgeClass = "bg-gray-50 text-gray-500 border-gray-100";

          return (
            <div key={bill.id} className="group flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 text-gray-500 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-900">{bill.name}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${badgeClass}`}>
                      {bill.daysUntilDue === 1 ? "Due tomorrow" : `Due in ${bill.daysUntilDue} days`}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-900 tabular-nums">
                  {formatINR(bill.amount)}
                </span>
                
                {/* Checkmark Action wrapped in TransactionDialog for pre-filling */}
                <TransactionDialog 
                  categories={categories} 
                  activeMonth={activeMonth}
                  prefill={{
                    type: "expense",
                    amount: bill.amount,
                    description: bill.name,
                    category_name: bill.category
                  }}
                  customTrigger={
                    <button className="p-1 text-gray-300 hover:text-green-500 transition-colors" title="Mark as Paid">
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                  }
                >
                  <button className="p-1 text-gray-300 hover:text-green-500 transition-colors" title="Mark as Paid">
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                </TransactionDialog>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
