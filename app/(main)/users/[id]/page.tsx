"use client";
import ExpenseList from '@/components/ExpenseList';
import SettlementsList from '@/components/SettlementsList';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/convex/_generated/api';
import { useFetchQuery } from '@/hooks/useFetchQuery';
import { toggleViewOptions } from '@/lib/constants/toggleOptions'
import { QueryData } from '@/lib/models';
import { ArrowLeft, ArrowLeftRight, Plus, UserIcon } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import React, { useState } from 'react';

const Userpage = () => {
  const [activetab, setActiveTab] = useState(toggleViewOptions[0]);
  const params = useParams();
  const router= useRouter();
  const { data, loading, error } = useFetchQuery(
    api.individualExpenses.getIndividualExpenses,
    {userId:params.id}
  );

  const typedData = data as QueryData | undefined;

  const expensesWhereBothUserOrMeInvolved = typedData?.expensesWhereBothUserOrMeInvolved ?? [];
  const settlementsWhereBothInvolved = typedData?.settlementsWhereBothInvolved ?? [];
  const otherUserDetails = typedData?.otherUserDetails ?? undefined;
  const balance = typedData?.balance ?? 0;
  

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
          <Avatar className="w-14 h-14">
            {otherUserDetails?.imageUrl ? (
              <AvatarImage
                src={otherUserDetails.imageUrl}
                alt={otherUserDetails.name || "User"}
              />
            ) : (
              <AvatarFallback>
                {/* Use initials for fallback or lucide user icon */}
                {otherUserDetails?.name
                  ? otherUserDetails.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                  : (
                    <UserIcon className="w-7 h-7 text-gray-400" />
                  )
                }
              </AvatarFallback>
            )}
          </Avatar>
        </div>
        <div>
          <div className="text-lg font-medium text-gray-900">
            {otherUserDetails?.name ?? "Unknown User"}
          </div>
          <div className="text-sm text-gray-600">
            {otherUserDetails?.email ?? ""}
          </div>
        </div>
      </div>
      <div className="flex space-x-3 mb-8">
        <Button
          type="button"
          className="inline-flex items-center px-4 py-2 rounded bg-green-500 hover:bg-green-600 text-white font-medium transition focus:outline-none"
          onClick={() => router.push(`/settlements/user/${params.id}`)}
        >
          <span className="mr-2">
            <ArrowLeftRight className="w-5 h-5" />
          </span>
          Settle Up
        </Button>
        <Button
          type="button"
          className="inline-flex items-center px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white font-medium transition focus:outline-none"
          onClick={() => router.push(`/expenses/new?id=${params.id}&type=individual`) }
        >
          <span className="mr-2">
            <Plus className="w-5 h-5" />
          </span>
          Add Expense
        </Button>
      </div>
      <Card className="w-full">
        <CardHeader>
          <div className="text-xl font-semibold text-gray-900">
            Balance
          </div>
        </CardHeader>
        <CardContent>
        {balance === 0 ? (
          <div className="text-green-600 font-medium">You are all settled</div>
        ) : balance > 0 ? (
          <div>
            <span className="font-medium">{otherUserDetails?.name ?? "The user"}</span> owes you
          </div>
        ) : (
          <div>
            You owe <span className="font-medium">{otherUserDetails?.name ?? "the user"}</span>
          </div>
        )}
        {balance > 0 && (
          <div className="text-green-600 text-lg font-bold">
            ₹{balance.toFixed(2)}
          </div>
        )}
        {balance < 0 && (
          <div className="text-red-600 text-lg font-bold">
            ₹{Math.abs(balance).toFixed(2)}
          </div>
        )}
        </CardContent>
      </Card>
    {/* Toggle Tabs Section */}
    <div className="w-full mt-8">
      <Tabs defaultValue="expenses" onValueChange={setActiveTab}>
        <TabsList className="flex space-x-4 border-b border-gray-200">
          <TabsTrigger
            value="expenses"
            className="py-2 px-4 text-gray-700 font-medium border-b-2 transition-all"
          >
            Expenses({expensesWhereBothUserOrMeInvolved.length})
          </TabsTrigger>
          <TabsTrigger
            value="settlements"
            className="py-2 px-4 text-gray-700 font-medium border-b-2 transition-all"
          >
            Settlements({settlementsWhereBothInvolved.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="expenses" className="py-4">
          {/* Expenses Tab Content */}
          <ExpenseList
            expenses= {expensesWhereBothUserOrMeInvolved}
            showPayerInGroup={false}
            otherPersonID={params.id as string }
            userLookupMap={
              otherUserDetails?.id
                ? { [String(otherUserDetails.id)]: otherUserDetails }
                : {}
            }
          />
        </TabsContent>
        <TabsContent value="settlements" className="py-4">
          {/* Settlements Tab Content */}
          <SettlementsList
             settlements={settlementsWhereBothInvolved}
             userLookupMap={
              otherUserDetails?.id
                ? { [String(otherUserDetails.id)]: otherUserDetails }
                : {}
            }
          />
        </TabsContent>
      </Tabs>
    </div>
    </div>
  );
};

export default Userpage;
