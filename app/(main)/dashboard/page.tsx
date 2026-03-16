"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useFetchQuery } from "@/hooks/useFetchQuery";
import type {
  GetUserBalancesResult,
  GetTotalSpentResult,
  GroupWithBalance,
} from "@/lib/models";
import { EyeIcon, PlusCircle } from "lucide-react";
import Link from "next/dist/client/link";
import React from "react";
import { BarLoader } from "react-spinners";
import ExpenseDetails from "./Components/expense-details";
import BalanceDetails from "./Components/balance-details";
import GroupList from "./Components/group-list";

function Dashboard() {
  const { data: userBalances, loading: userBalancesLoading } =
    useFetchQuery<GetUserBalancesResult>(api.dashboard.getUserBalances);
  const { data: totalSpent, loading: totalSpentLoading } =
    useFetchQuery<GetTotalSpentResult>(api.dashboard.getTotalSpent);
  const { data: groupExpenses, loading: groupExpensesLoading } =
    useFetchQuery<GroupWithBalance[]>(api.dashboard.getGroupExpenses);

  const isLoading= userBalancesLoading || totalSpentLoading || groupExpensesLoading;

  return (
    <div>
      {isLoading?
      (<div className="w-full h-screen flex items-center justify-center">
        <BarLoader width={"100%"} color='#000080'/>
      </div>)
      :
      <>
        <div className='flex items-center justify-between'>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Button>
            <Link href="/expenses/new">
              <PlusCircle className='mr-2 h-4 w-4'/>
              Add Expense
            </Link>
          </Button>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-4'>
          <Card>
             <CardHeader className='pb-2' >
              <CardTitle className='text-sm front-medium text-muted-foreground'>
                User Balance
              </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">
                 {userBalances != null
                   ? userBalances.userIsOwed - userBalances.userOwe > 0
                     ? (
                         <>
                           <span className="text-green-600">{`$${userBalances.userIsOwed - userBalances.userOwe}`}</span>
                           <p className="text-sm text-green-600">You are owed this amount</p>
                         </>
                       )
                     : (
                         <>
                           <span className="text-red-600">{`-$${userBalances.userOwe - userBalances.userIsOwed}`}</span>
                           <p className="text-sm text-red-600">You owe this amount</p>
                         </>
                       )
                   : <span className="text-gray-500">$0</span>}
               </div>
              </CardContent> 
          </Card>
          <Card>
            <CardHeader className='pb-2' >
              <CardTitle className='text-sm front-medium text-muted-foreground'>
                You are owed
              </CardTitle>
              <CardContent>
                <div className="text-2xl font-bold">
                  {userBalances != null
                    ? <span className="text-green-600">{`$${userBalances.userIsOwed}`}</span>
                    : <span className="text-gray-500">$0</span>}
                </div>
                <p>from {userBalances?.owingDetails?.userIsOwed?.length ?? 0} people</p>
              </CardContent>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className='pb-2' >
              <CardTitle className='text-sm front-medium text-muted-foreground'>
                You owe
              </CardTitle>
              <CardContent>
                <div className="text-2xl font-bold">
                  {userBalances != null
                    ? <span className="text-red-600">{`$${userBalances.userOwe}`}</span>
                    : <span className="text-gray-500">$0</span>}
                </div>
              </CardContent>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className='pb-2' >
              <CardTitle className='text-sm front-medium text-muted-foreground'>
                You are owed
              </CardTitle>
              <CardContent>
                <div className="text-2xl font-bold">
                  {userBalances != null
                    ? <span className="text-green-600">{`$${userBalances.userIsOwed}`}</span>
                    : <span className="text-gray-500">$0</span>}
                </div>
              </CardContent>
            </CardHeader>
          </Card> 
        </div>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-4'>
          <div className='col-span-2 space-y-6'>
            <ExpenseDetails expenses={totalSpent} />
          </div>
          <div className='col-span-1 space-y-6'>
          <Card>
            <CardHeader className='pb-2 flex items-center justify-between' >
              <CardTitle >
                Balance Details
              </CardTitle>
              <Button 
               variant='link' 
               className='p-0'
               asChild
               >
                <Link href="/contacts">
                  <span className='text-sm text-blue-500'>View All</span>
                  <EyeIcon className='h-4 w-4 ml-2' />
                </Link>
               </Button>
               </CardHeader>
              <CardContent>
               <BalanceDetails balances={userBalances} />
              </CardContent>
          </Card>
          <Card>
            <CardHeader className='pb-2 flex items-center justify-between' >
              <CardTitle >
                Balance Details for groups
              </CardTitle>
              <Button 
               variant='link' 
               className='p-0'
               asChild
               >
                <Link href="/contacts">
                  <span className='text-sm text-blue-500'>View All</span>
                  <EyeIcon className='h-4 w-4 ml-2' />
                </Link>
               </Button>
               </CardHeader>
              <CardContent>
               <GroupList groupExpenses={groupExpenses} />
              </CardContent>
              <CardFooter>
                <Button variant="outline" asChild>
                  <Link href="/contacts?createGroup=true">
                    <span className='text-sm text-blue-500'>Create Group</span>
                    <PlusCircle className='h-4 w-4 ml-2' />
                  </Link>
                </Button>
              </CardFooter>
          </Card>
          </div>
        </div>
      </> }
    </div>
  )
}

export default Dashboard
