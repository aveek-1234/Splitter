import { GroupWithBalance } from '@/lib/models'
import { Users } from 'lucide-react'
import React from 'react'

function GroupList({ groupExpenses }: { groupExpenses: GroupWithBalance[] | undefined }) {
  const hasGroups = !!groupExpenses && groupExpenses.length > 0;

  if (!hasGroups) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        You are not part of any groups yet. Create a group to start tracking shared expenses.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groupExpenses!.map((group) => (
        <div
          key={group._id}
          className="flex items-center justify-between rounded-md border px-3 py-2"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">{group.name}</p>
              <p className="text-xs text-muted-foreground">
                Members: {group.members.length}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p
              className={`text-sm font-semibold ${
                group.balance > 0 ? 'text-green-600' : group.balance < 0 ? 'text-red-600' : 'text-muted-foreground'
              }`}
            >
              ${group.balance.toFixed(2)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default GroupList
