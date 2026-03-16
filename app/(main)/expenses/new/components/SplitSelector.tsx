"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { User, Split } from "@/lib/models"

export type SplitType = "equal" | "percentage" | "exact amount"

export type SplitSelectorProps = {
  type: SplitType
  amount: string
  participants: User[]
  paidByUserId: string
  currentUserId: string
  onSplitsChange: (splits: Split[]) => void
}

export function SplitSelector({
  type,
  amount,
  participants,
  paidByUserId,
  currentUserId,
  onSplitsChange,
}: SplitSelectorProps) {
  const [localSplits, setLocalSplits] = useState<Split[]>([])
  const [percentSplits, setPercentSplits] = useState<{ userId: string; percentage: number }[]>(
    participants.map((p) => ({ userId: p._id, percentage: 0 }))
  )

  // whenever relevant inputs change, compute a baseline set of splits and
  // inform the parent
  useEffect(() => {
    const total = parseFloat(amount) || 0
    let computed: Split[] = participants.map((p) => ({
      userId: p._id,
      amount: 0,
      paid: p._id === paidByUserId,
    }))

    if (type === "equal" && participants.length > 0) {
      const per = total / participants.length
      computed = participants.map((p) => ({
        userId: p._id,
        amount: per,
        paid: p._id === paidByUserId,
      }))
    }

    setLocalSplits(computed)
    onSplitsChange(computed)
  }, [type, amount, participants, paidByUserId, onSplitsChange])

  const updateSplit = (userId: string, value: number) => {
    let calculated = value
    if (type === "percentage") {
      const total = parseFloat(amount) || 0
      // value is the percentage entered, convert to amount
      calculated = (value / 100) * total
    }
    // for "exact amount" we just use the value directly, and for "equal" the inputs are read-only
    const next = localSplits.map((s) =>
      s.userId === userId ? { ...s, amount: calculated } : s
    )
    console.log(next);
    console.log(percentSplits);
    setLocalSplits(next)
    onSplitsChange(next)
  }

  return (
    <div className="space-y-2">
      {participants.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add participants to configure splits.
        </p>
      ) : (
        <div className="space-y-1">
          {localSplits.map((split) => {
            const participant = participants.find(
              (p) => p._id === split.userId
            )!
            return (
              <div
                key={split.userId}
                className="flex items-center gap-2"
              >
                <span className="flex-1 truncate">
                  {participant._id === currentUserId ? "You" : participant.name}
                </span>
                {type === "equal" ? (
                  <span className="w-24 text-right">
                    {split.amount.toFixed(2)}
                  </span>
                ) : (
                  <div>
                    {type === "percentage" && (
                      <>
                      <Input
                        type="number"
                        step="any"
                        value={percentSplits.find((s) => s.userId === split.userId)?.percentage || ""}
                        onChange={(e) => {
                          const percentage = parseFloat(e.target.value) || 0
                          setPercentSplits((prev) => {
                            const next = prev.map((s) =>
                            {
                            console.log(s.userId, split.userId, percentage) 
                            s.userId === split.userId ? { ...s, percentage } : s
                            console.log(s);
                            return s
                          }
                            )
                            console.log(next);
                            return next
                          })
                          updateSplit(split.userId, percentage)
                        }} />
                      <span className="mx-1">%</span>
                      </>
                    )}
                    <Input
                    type="number"
                    step="any"
                    disabled={type != "exact amount"}
                    value={localSplits.find((s) => s.userId === split.userId)?.amount || ""}
                    onChange={(e) =>
                      updateSplit(split.userId, parseFloat(e.target.value) || 0)
                    }
                    className="w-24"
                  />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
