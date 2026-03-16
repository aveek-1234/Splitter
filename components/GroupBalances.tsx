"use client"
import { api } from '@/convex/_generated/api'
import { useFetchQuery } from '@/hooks/useFetchQuery'
import { GroupBalanceEntry, User } from '@/lib/models';
import {  currentUser } from '@clerk/nextjs/server';
import React from 'react'

interface GroupBalancesProps {
  balances: GroupBalanceEntry[]; // You may want to define a better type for balances if possible
}

function GroupBalances({ balances }: GroupBalancesProps) {
  const { data: currentUser }:{data?:User} = useFetchQuery(api.users.getCurrentUser);

  if (!balances) {
    return (
      <div className="text-center text-gray-500 bg-gray-100 rounded p-4">
        No balance found
      </div>
    );
  }
  const myBalances= balances.find((balance)=>balance.id===currentUser?._id)

  const userBalancesMap= Object.fromEntries(balances.map((balance)=>[balance.id, balance]))

  const membersWhoOweMe = myBalances?.userOwedBy.map(({ from, amount }) => ({
    ...userBalancesMap[from],
    amount,
  }));

  const membersToWhomIOwe = myBalances?.userOwe.map(({ to, amount }) => ({
    ...userBalancesMap[to],
    amount,
  }));

  const isAllSettled= myBalances?.totalOutstandingBalance===0 && membersWhoOweMe?.length===0 && membersToWhomIOwe?.length===0

  return (
    <div>
    <div className="flex flex-col items-center mb-6">
      <div className="text-sm text-gray-500">Your total balance</div>
      <div
        className={
          "text-3xl font-bold mt-2 " +
          (myBalances && typeof myBalances.totalOutstandingBalance === "number"
            ? myBalances.totalOutstandingBalance === 0
              ? "text-green-600"
              : myBalances.totalOutstandingBalance > 0
              ? "text-green-600"
              : "text-red-600"
            : "")
        }
      >
        {typeof myBalances?.totalOutstandingBalance === "number" ? (
          myBalances.totalOutstandingBalance === 0 ? (
            <span>You are all settled</span>
          ) : (
            <>
              {myBalances.totalOutstandingBalance > 0 ? "+₹" : "-₹"}
              {Math.abs(myBalances.totalOutstandingBalance).toFixed(2)}
            </>
          )
        ) : (
          <span>-</span>
        )}
      </div>
    </div>
    </div>
  )
}

export default GroupBalances
