"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/convex/_generated/api"
import { useFetchQuery } from "@/hooks/useFetchQuery"
import { cn } from "@/lib/utils"
import { Loader2, Users } from "lucide-react"

export type GroupWithMembers = {
  id: string
  name: string
  description?: string
  members: { id: string; name: string; email: string; imageUrl?: string }[]
  otherMembers: { id: string; name: string; email: string; imageUrl?: string }[]
}

type GroupSelectorProps = {
  value: string
  onChange: (groupId: string) => void
  error?: { message?: string }
  disabled?: boolean
}

export function GroupSelector({
  value,
  onChange,
  error,
  disabled,
}: GroupSelectorProps) {
  
  const { data: groups = [], loading } = useFetchQuery<GroupWithMembers[]>(
    api.groupExpenses.getUserGroupsWithMembers
  )

  const selected = groups.find((g) => g.id === value)
  const displayValue = selected?.name ?? "Select group..."

  if (loading) {
    return (
      <div
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground",
          error?.message && "border-destructive"
        )}
      >
        <Loader2 className="size-4 shrink-0 animate-spin opacity-50" />
        <span>Loading groups...</span>
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-md border border-dashed border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground",
          error?.message && "border-destructive"
        )}
      >
        <Users className="size-4 shrink-0 opacity-50" />
        <span>You&apos;re not in any groups</span>
      </div>
    )
  }

  return (
    <Select
      value={value || undefined}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          "w-full",
          error?.message && "border-destructive focus-visible:ring-destructive"
        )}
      >
        <SelectValue placeholder="Select group...">
          {displayValue}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {groups.map((group) => (
          <SelectItem key={group.id} value={group.id}>
            <span className="truncate">
              {group.name}
              <span className="ml-1.5 text-muted-foreground">
                ({group.members.length} member{group.members.length !== 1 ? "s" : ""})
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
