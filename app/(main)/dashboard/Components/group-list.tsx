import { GroupWithBalance } from '@/lib/models'
import { Users } from 'lucide-react'
import React from 'react'

function GroupList({ groupExpenses }: { groupExpenses: GroupWithBalance[] | undefined }) {
  const hasGroups = !!groupExpenses && groupExpenses.length > 0;

  if (!hasGroups) {
    return (
      <div className="text-xs text-muted-foreground text-center py-3">
        <p>No groups yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {groupExpenses!.slice(0, 5).map((group) => (
        <div
          key={group._id}
          className="flex items-center justify-between rounded-md p-2 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted shrink-0">
              <Users className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{group.name}</p>
              <p className="text-xs text-muted-foreground">
                {group.members.length} member{group.members.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0 ml-2">
            <p
              className={`text-xs font-semibold ${
                group.balance > 0 ? 'text-green-600' : group.balance < 0 ? 'text-red-600' : 'text-muted-foreground'
              }`}
            >
              ${group.balance.toFixed(2)}
            </p>
          </div>
        </div>
      ))}
      {groupExpenses!.length > 5 && (
        <p className='text-xs text-muted-foreground mt-2'>+{groupExpenses!.length - 5} more</p>
      )}
    </div>
  )
}

export default GroupList
