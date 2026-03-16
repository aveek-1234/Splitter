"use client"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { ExpenseCategory } from "@/lib/expenseCategory"
import { Check, ChevronsUpDown } from "lucide-react"
import React, { useState } from "react"

type CategoryAutocompleteProps = {
  value: string
  onChange: (value: string) => void
  categories: ExpenseCategory[]
  error?: { message?: string }
}

export function CategoryAutocomplete({
  value,
  onChange,
  categories,
  error,
}: CategoryAutocompleteProps) {
  const [open, setOpen] = useState(false)

  const selected = categories.find((c) => c.value === value)
  const displayValue = selected?.label ?? "Select category..."

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            error?.message && "border-destructive"
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {selected?.icon && <selected.icon className="size-4 shrink-0 opacity-70" />}
            {displayValue}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder="Search category..." />
          <CommandList>
            <CommandEmpty>No category found.</CommandEmpty>
            <CommandGroup>
              {categories.map((cat) => {
                const Icon = cat.icon
                return (
                  <CommandItem
                    key={cat.value}
                    value={cat.label}
                    onSelect={() => {
                      onChange(cat.value)
                      setOpen(false)
                    }}
                  >
                    <Icon className="mr-2 size-4 shrink-0 opacity-70" />
                    {cat.label}
                    <Check
                      className={cn(
                        "ml-auto size-4",
                        value === cat.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
