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
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-9 w-full flex items-center gap-1.5 rounded-lg px-3 text-sm transition-all focus:outline-none"
        style={{
          background: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          border: `1px solid ${open ? 'var(--border-brand, #1E6B4E)' : 'var(--border-default)'}`,
          boxShadow: open ? '0 0 0 3px var(--focus-ring)' : 'none',
        }}
      >
        {selected?.icon && (
          <span className="shrink-0 flex items-center">{selected.icon}</span>
        )}
        <span
          className="flex-1 truncate text-left"
          style={{ color: selected ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
        >
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 transition-transform duration-150",
            open && "rotate-180"
          )}
          style={{ color: 'var(--text-tertiary)' }}
        />
      </button>

      {/* Dropdown list */}
      {open && (
        <div
          className="absolute top-full left-0 mt-1.5 z-50 min-w-full rounded-xl py-1 overflow-hidden"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            // Premium dark shadow — works in both light and dark mode
            boxShadow: '0 8px 24px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)',
          }}
        >
          {options.map((opt) => {
            const isActive = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors"
                style={
                  isActive
                    ? { background: 'var(--bg-active-nav)', color: 'var(--text-brand)' }
                    : { color: 'var(--text-primary)' }
                }
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'var(--tag-bg)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                {opt.icon && (
                  <span className="shrink-0 flex items-center">{opt.icon}</span>
                )}
                <span className="flex-1">{opt.label}</span>
                {isActive && (
                  <Check className="size-3.5 shrink-0" style={{ color: 'var(--text-brand)' }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
