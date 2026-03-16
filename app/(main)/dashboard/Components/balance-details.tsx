import { GetUserBalancesResult } from '@/lib/models'
import { IndianRupeeIcon } from 'lucide-react';
import React from 'react'

function BalanceDetails({ balances }: { balances: GetUserBalancesResult | undefined }) {
  if (!balances) return null;
  const { userOwe, userIsOwed, owingDetails } = balances || {};
  const { userOwe: userOweDetails, userIsOwed: userIsOwedDetails } = owingDetails || {};
  const isAllSettled :boolean = userOwe === 0 && userIsOwed === 0;
  return (
    <div>
      {isAllSettled ? (
        <div className='text-center text-sm text-gray-500'><p>All your balances are settled</p></div>
      )
      :
      (
        userIsOwedDetails.length > 0 ? (
          <div>
            <h3 className='text-lg font-medium'>
              You are owed 
              <IndianRupeeIcon color='green' className='w-4 h-4 ml-2' />
            </h3>
            <ul>
              {userIsOwedDetails.map((detail) => (
                <li key={detail.userId}>{detail.name} - {detail.netBalance}</li>
              ))}
            </ul>
          </div>
        )
        :
        (
          <div>
            <h3 className='text-lg font-medium'>
              You owe
              <IndianRupeeIcon color='red' className='w-4 h-4 ml-2' />
            </h3>
            <ul>
              {userOweDetails.map((detail) => (
                <li key={detail.userId}>{detail.name} - {detail.netBalance}</li>
              ))}
            </ul>
          </div>
        )
      )
      }
    </div>
  )
}

export default BalanceDetails
