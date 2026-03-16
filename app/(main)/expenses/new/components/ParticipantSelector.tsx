"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { User } from "@/lib/models"
import { Badge } from "@/components/ui/badge"
import { X, Users, Search, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/convex/_generated/api"
import { useFetchQuery } from "@/hooks/useFetchQuery"

type ParticipantSelectorProps = {
  selectedParticipants: User[]
  onChange: (selected: User[]) => void
  error?: { message?: string }
  disabled?: boolean
}

export function ParticipantSelector({
  selectedParticipants,
  onChange,
  error,
  disabled = false,
}: ParticipantSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Use useFetchQuery with search query - only fetch when there's a non-empty search
  const shouldSearch = searchQuery.trim().length > 0
  const { data: searchResults = [], loading: isSearching } = useFetchQuery<User[]>(
    api.users.searchUsers,
    shouldSearch ? { query:                                                                                                                                                                                                                                                                                                                                                                            
      searchQuery.trim() } : "skip"
  )

  const handleParticipantToggle = (participant: User, isChecked: boolean) => {
    if (isChecked) {
      // Add participant if not already selected
      if (!selectedParticipants.find((p) => p._id === participant._id)) {
        onChange([...selectedParticipants, participant])
        setSearchQuery("")
      }
    } else {
      // Remove participant
      onChange(selectedParticipants.filter((p) => p._id !== participant._id))
    }
  }

  const handleRemoveParticipant = (participantId: string) => {
    onChange(selectedParticipants.filter((p) => p._id !== participantId))
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Participants</label>

      {/* Selected Participants Display */}
      <div
        className={cn(
          "flex flex-wrap gap-2 p-3 rounded-md border min-h-10",
          error?.message ? "border-destructive bg-destructive/5" : "border-input bg-muted/30",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {selectedParticipants.length === 0 ? (
          <span className="text-sm text-muted-foreground">Select participants...</span>
        ) : (
          selectedParticipants.map((participant) => (
            <Badge key={participant._id} variant="secondary" className="pr-1">
              <span className="truncate max-w-xs">{participant.name}</span>
              <button
                type="button"
                onClick={() => handleRemoveParticipant(participant._id)}
                disabled={disabled}
                className="ml-1 hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
      </div>

      {/* Dropdown Button */}
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          {`${selectedParticipants.length} selected`}
        </span>
        <span className={cn("transition-transform", isOpen && "rotate-180")}>▼</span>
      </Button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="relative z-50 w-full bg-white border border-input rounded-md shadow-md p-3 mt-1">
          {/* Search Input */}
          <div className="mb-3 relative">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search participants by name or email..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                disabled={disabled}
                className="pl-8"
                autoFocus
              />
              {isSearching && (
                <Loader2 className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Search Results */}
          {searchQuery.trim().length > 0 ? (
            <div>
              {isSearching ? (
                <div className="text-center py-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No participants found
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.map((participant) => {
                    const isSelected = selectedParticipants.some((p) => p._id === participant._id)
                    return (
                      <div
                        key={participant._id}
                        className="flex items-center gap-2 p-2 hover:bg-muted rounded-sm cursor-pointer"
                        onClick={() => handleParticipantToggle(participant, !isSelected)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) =>
                            handleParticipantToggle(participant, e.target.checked)
                          }
                          disabled={disabled}
                          className="cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{participant.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{participant.email}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Type to search for participants...
            </div>
          )}

      {/* Error Message */}
      {error?.message && <p className="text-sm text-destructive">{error.message}</p>}

      {/* Info Text */}
      <p className="text-xs text-muted-foreground">
        Search and select participants for this expense.
      </p>
    </div>
        )}
    </div>
  )}
