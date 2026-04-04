import { GetUserBalancesResult } from '@/lib/models'
import { IndianRupeeIcon } from 'lucide-react';
import React from 'react'

function BalanceDetails({ balances }: { balances: GetUserBalancesResult | undefined }) {
  if (!balances) return null;
  const { userOwe, userIsOwed, owingDetails } = balances || {};
  const { userOwe: userOweDetails, userIsOwed: userIsOwedDetails } = owingDetails || {};
  const isAllSettled :boolean = userOwe === 0 && userIsOwed === 0;
  
  return (
    <div className='space-y-3'>
      {isAllSettled ? (
        <div className='text-center text-xs text-muted-foreground py-4'>
          <p>All balances settled ✓</p>
        </div>
      )
      :
      (
        userIsOwedDetails && userIsOwedDetails.length > 0 ? (
          <div>
            <div className='flex items-center gap-1 mb-2'>
              <p className='text-xs font-semibold text-green-600'>Owed to you</p>
              <IndianRupeeIcon color='green' className='w-3 h-3' />
            </div>
            <ul className='space-y-1'>
              {userIsOwedDetails.slice(0, 5).map((detail) => (
                <li key={detail.userId} className='text-xs flex justify-between'>
                  <span className='truncate'>{detail.name}</span>
                  <span className='text-green-600 font-medium'>${detail.netBalance.toFixed(2)}</span>
                </li>
              ))}
            </ul>
            {userIsOwedDetails.length > 5 && (
              <p className='text-xs text-muted-foreground mt-1'>+{userIsOwedDetails.length - 5} more</p>
            )}
          </div>
        )
        :
        (
          <div>
            <div className='flex items-center gap-1 mb-2'>
              <p className='text-xs font-semibold text-red-600'>You owe</p>
              <IndianRupeeIcon color='red' className='w-3 h-3' />
            </div>
            <ul className='space-y-1'>
              {userOweDetails && userOweDetails.slice(0, 5).map((detail) => (
                <li key={detail.userId} className='text-xs flex justify-between'>
                  <span className='truncate'>{detail.name}</span>
                  <span className='text-red-600 font-medium'>${detail.netBalance.toFixed(2)}</span>
                </li>
              ))}
            </ul>
            {userOweDetails && userOweDetails.length > 5 && (
              <p className='text-xs text-muted-foreground mt-1'>+{userOweDetails.length - 5} more</p>
            )}
          </div>
        )
      )
      }
    </div>
  )
}

export default BalanceDetails
