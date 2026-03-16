"use client"
import ExpenseList from '@/components/ExpenseList';
import GroupBalances from '@/components/GroupBalances';
import GroupMembers from '@/components/GroupMembers';
import SettlementsList from '@/components/SettlementsList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/convex/_generated/api';
import { useFetchQuery } from '@/hooks/useFetchQuery';
import { toggleViewOptions } from '@/lib/constants/toggleOptions';
import { GroupExpensesData, QueryData } from '@/lib/models';
import { ArrowLeft, ArrowLeftRight, Plus, Users } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import React, { useState } from 'react'

function page() {
  const [activetab, setActiveTab] = useState(toggleViewOptions[0]);
  const params = useParams();
  const router= useRouter()
  const { data, loading, error } = useFetchQuery(
    api.groupExpenses.getGroupExpenses,
    {groupId:params.id}
  );

  const typedData = data as GroupExpensesData;

  const { expenses, settlements, groupDetails, members, groupBalances,userLookup } = typedData || {};


  return (
    <div>
      <div className="mb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>
      </div>
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-14 h-14">
        {/* Display group icon using Users from lucide-react */}
        <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center">
          <Users className="w-10 h-10 text-gray-500" />
        </div>
        </div>
        <div>
          <div className="text-lg font-medium text-gray-900">
            {groupDetails?.name ?? "Unknown User"}
          </div>
          <div className="text-sm text-gray-600">
            {groupDetails?.description ?? ""}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {members ? `${members.length} member${members.length === 1 ? "" : "s"}` : "0 members"}
          </div>
        </div>
        <div className="flex space-x-3 mb-8">
        <Button
          type="button"
          className="inline-flex items-center px-4 py-2 rounded bg-green-500 hover:bg-green-600 text-white font-medium transition focus:outline-none"
          onClick={() => router.push(`/settlements/group/${params.id}`)}
        >
          <span className="mr-2">
            <ArrowLeftRight className="w-5 h-5" />
          </span>
          Settle Up
        </Button>
        <Button
          type="button"
          className="inline-flex items-center px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white font-medium transition focus:outline-none"
          onClick={() => router.push("/expenses/new")}
        >
          <span className="mr-2">
            <Plus className="w-5 h-5" />
          </span>
          Add Expense
        </Button>
      </div>
      </div> 
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full mt-8">
      {/* First div takes 2 columns on large devices */}
      <div className="bg-white rounded-lg shadow p-4 lg:col-span-2">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-gray-500" />
            <CardTitle className="text-lg font-semibold">Group Balances</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <GroupBalances balances={groupBalances} />
        </CardContent>
      </Card>
      </div>
      {/* Second div takes remaining 1 column */}
      <div className="bg-white rounded-lg shadow p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-gray-500" />
            <CardTitle className="text-lg font-semibold">Members</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <GroupMembers members={members} />
        </CardContent>
      </Card>
      </div>
    </div>
    <Tabs defaultValue="expenses" onValueChange={setActiveTab}>
        <TabsList className="flex space-x-4 border-b border-gray-200">
          <TabsTrigger
            value="expenses"
            className="py-2 px-4 text-gray-700 font-medium border-b-2 transition-all"
          >
            Expenses({expenses.length})
          </TabsTrigger>
          <TabsTrigger
            value="settlements"
            className="py-2 px-4 text-gray-700 font-medium border-b-2 transition-all"
          >
            Settlements({settlements.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="expenses" className="py-4">
          {/* Expenses Tab Content */}
          <ExpenseList
            expenses= {expenses}
            showPayerInGroup={true}
            otherPersonID={params.id as string }
            userLookupMap={userLookup}
          />
        </TabsContent>
        <TabsContent value="settlements" className="py-4">
          {/* Settlements Tab Content */}
          <SettlementsList
             settlements={settlements}
             userLookupMap={userLookup}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default page
