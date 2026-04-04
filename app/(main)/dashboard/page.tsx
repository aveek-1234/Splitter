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
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                User Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userBalances != null ? (
                userBalances.userIsOwed - userBalances.userOwe > 0 ? (
                  <>
                    <p className="text-3xl font-bold text-green-600">
                      ${(userBalances.userIsOwed - userBalances.userOwe).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">You are owed</p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-red-600">
                      ${(userBalances.userOwe - userBalances.userIsOwed).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">You owe</p>
                  </>
                )
              ) : (
                <>
                  <p className="text-3xl font-bold text-gray-500">$0.00</p>
                  <p className="text-xs text-muted-foreground mt-1">Balanced</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                You are owed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                ${userBalances?.userIsOwed?.toFixed(2) ?? "0.00"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                from {userBalances?.owingDetails?.userIsOwed?.length ?? 0} people
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                You owe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">
                ${userBalances?.userOwe?.toFixed(2) ?? "0.00"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                to {userBalances?.owingDetails?.userOwe?.length ?? 0} people
              </p>
            </CardContent>
          </Card>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-8'>
          <div className='md:col-span-2'>
            <ExpenseDetails expenses={totalSpent} />
          </div>
          <div className='md:col-span-1 space-y-4'>
            <Card>
              <div className='flex items-center justify-between mb-2'>
                <CardHeader className='pb-0 flex-1'>
                  <CardTitle className='text-base'>Balance Details</CardTitle>
                </CardHeader>
                <Button 
                  variant='ghost' 
                  className='h-8 w-8 p-0'
                  asChild
                >
                  <Link href="/contacts">
                    <EyeIcon className='h-4 w-4' />
                  </Link>
                </Button>
              </div>
              <CardContent className='pt-2'>
                <BalanceDetails balances={userBalances} />
              </CardContent>
            </Card>

            <Card>
              <div className='flex items-center justify-between mb-2'>
                <CardHeader className='pb-0 flex-1'>
                  <CardTitle className='text-base'>Group Balance</CardTitle>
                </CardHeader>
                <Button 
                  variant='ghost' 
                  className='h-8 w-8 p-0'
                  asChild
                >
                  <Link href="/contacts">
                    <EyeIcon className='h-4 w-4' />
                  </Link>
                </Button>
              </div>
              <CardContent className='pt-2'>
                <GroupList groupExpenses={groupExpenses} />
              </CardContent>
              <CardFooter className='pt-4'>
                <Button variant="outline" size="sm" asChild className='w-full'>
                  <Link href="/contacts?createGroup=true">
                    <PlusCircle className='h-4 w-4 mr-2' />
                    Create Group
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
