import React from 'react'

import { Settlement, OtherUserDetails, User, GroupMemberDetail } from '@/lib/models';
import { useFetchQuery } from '@/hooks/useFetchQuery';
import { api } from '@/convex/_generated/api';
import { Card, CardContent } from './ui/card';
import { ArrowLeftRight } from 'lucide-react';
import { format } from 'date-fns/format';

type SettlementsListProps = {
  settlements: Settlement[];
  isGroupSettlement?:boolean
  userLookupMap: { [key: string]: OtherUserDetails } | Record<string, GroupMemberDetail | null>;
}

function SettlementsList({
  settlements,
  isGroupSettlement=false,
  userLookupMap
}: SettlementsListProps) {
  const {data:currentUser}: { data?: User } = useFetchQuery(api.users.getCurrentUser);
  // INSERT_YOUR_CODE
 

  if (!settlements || settlements.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No settlement found
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  function getName(id:string)
  {
     return id===currentUser?._id ? "You" : userLookupMap[id]?.name|| "Other user"
  }
  return (  
    <div>
      {settlements.map((settlement)=>{
        const payerName = getName(settlement.paidByUserId);
        const receiverName = getName(settlement.receivedByUserId);
        const isPayerCurrentUser = settlement.paidByUserId === currentUser?._id;
        const isReceiverCurrentUser = settlement.receivedByUserId === currentUser?._id;
        return (
          <Card
            key={settlement._id}
          >
            <CardContent>
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <ArrowLeftRight className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">
                      {isPayerCurrentUser
                        ? `You paid ${receiverName}`
                        : isReceiverCurrentUser
                          ? `${payerName} paid you`
                          : `${payerName} paid ${receiverName}`}
                    </h3>
                    <div className="flex items-center text-sm text-muted-foreground gap-2">
                      <span>
                        {format(new Date(settlement.date), "MMM d, yyyy")}
                      </span>
                      {settlement.note && (
                        <>
                          <span>•</span>
                          <span>{settlement.note}</span>
                        </>
                      )}
                    </div>
                  </div>
              </div>
            <div className="text-lg font-semibold">
              ₹ {settlement.amount.toFixed(2)}
            </div>
            </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  );
}

export default SettlementsList
