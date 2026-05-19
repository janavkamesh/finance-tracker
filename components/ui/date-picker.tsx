"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: Date | null
  onChange?: (date: Date | null) => void
  className?: string
  placeholder?: string
}

export function DatePicker({ value, onChange, className, placeholder = "Pick a date" }: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal rounded-md border-gray-300 shadow-sm focus-visible:ring-2 focus-visible:ring-[#1E6B4E]",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value || undefined}
          onSelect={(date) => {
            onChange?.(date ?? null)
            setIsOpen(false)
          }}
          initialFocus
          className="rounded-md"
        />
        <div className="flex items-center justify-between p-3 border-t">
          <button
            onClick={() => {
              onChange?.(null)
              setIsOpen(false)
            }}
            className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={() => {
              onChange?.(new Date())
              setIsOpen(false)
            }}
            className="text-sm font-medium text-[#1E6B4E] hover:text-[#154d38] transition-colors"
          >
            Today
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
