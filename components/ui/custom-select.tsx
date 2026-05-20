"use client";

import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  label: string;
  value: string;
  icon?: ReactNode;
}

interface Props {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function CustomSelect({ options, value, onChange, className, placeholder = "Select" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "h-9 w-full flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700",
          "hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E] transition-colors",
          open && "border-[#1E6B4E] ring-2 ring-[#1E6B4E]/20"
        )}
      >
        {selected?.icon && <span className="shrink-0 flex items-center">{selected.icon}</span>}
        <span className={cn("flex-1 truncate text-left", !selected && "text-gray-400")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 text-gray-400 shrink-0 transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 min-w-full rounded-xl border border-gray-200 bg-white shadow-lg shadow-gray-200/60 py-1 overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                value === opt.value
                  ? "bg-[#1E6B4E]/5 text-[#1E6B4E] font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              )}
            >
              {opt.icon && <span className="shrink-0 flex items-center">{opt.icon}</span>}
              <span className="flex-1">{opt.label}</span>
              {value === opt.value && (
                <Check className="size-3.5 text-[#1E6B4E] shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
