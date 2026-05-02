"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExportDialog } from '@/components/ExportDialog';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/convex/_generated/api';
import { useFetchQuery } from '@/hooks/useFetchQuery';
import { BarLoader } from 'react-spinners';
import { format } from 'date-fns/format';

export default function TransactionPage() {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const { data, loading, error } = useFetchQuery<{
    expenses: Array<{
      amount: number;
      paidOrReceived: 'paid' | 'received';
      isGroup: boolean;
      groupId: string | null | undefined;
      otherIndividualId: string | null;
      name: string;
      description: string;
      date: number;
      _id: string;
    }>;
    settlements: Array<{
      amount: number;
      paidOrReceived: 'paid' | 'received';
      isGroup: boolean;
      groupId: string | null | undefined;
      otherIndividualId: string | null;
      name: string;
      date: number;
      note?: string;
      _id: string;
    }>;
  }>(api.userTransactions.getUserTransactions);

  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <BarLoader width={"100%"} color="#000080" />
      </div>
    );
  }

  if (error || !data) {
    return <div>Error: {error}</div>;
  }
   const isWithinFilteredDate = (transactionDate: number, fromDate: Date | undefined, toDate: Date | undefined) => {
    if (!fromDate || !toDate) return true;
    const date = new Date(transactionDate);
    return date >= fromDate && date <= toDate;
  };
  // Combine and sort expenses and settlements by date (most recent first)
 const filteredExpenses = data.expenses
  .filter((expense) =>
    isWithinFilteredDate(expense.date, dateRange.from, dateRange.to)
  )
  .map((expense) => ({
    ...expense,
    type: "expense" as const,
    displayText:
      expense.paidOrReceived === "paid"
        ? `You paid to ${expense.name}`
        : `You received from ${expense.name}`,
    typeOfTransaction: "Expense",
  }));

const filteredSettlements = data.settlements
  .filter((settlement) =>
    isWithinFilteredDate(settlement.date, dateRange.from, dateRange.to)
  )
  .map((settlement) => ({
    ...settlement,
    type: "settlement" as const,
    displayText:
      settlement.paidOrReceived === "paid"
        ? `You have paid to ${settlement.name}`
        : `You have received from ${settlement.name}`,
    typeOfTransaction: "Settlement",
  }));

const allTransactions = [
  ...filteredExpenses,
  ...filteredSettlements,
].sort((a, b) => b.date - a.date);

  console.log('All Transactions:', allTransactions);

 

  return (
    <div className="space-y-6 pt-20 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Your transactions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review all your recent payments and activity in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Your transactions</CardTitle>
          </div>
          <ExportDialog
            isOpen={isExportOpen}
            onOpenChange={setIsExportOpen}
            title="Export Transactions"
            showFilterButton
            onFilter={(from, to) => {
              setDateRange({ from, to });
            }}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {allTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found
            </div>
          ) : (
            allTransactions.map((transaction) => (
              <div key={`${transaction.type}-${transaction._id}`} className="rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">
                      {transaction.displayText}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(transaction.date), "MMM d, yyyy")}
                      {transaction.isGroup && transaction.groupId && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Group
                        </span>
                      )}
                      {!transaction.isGroup && (
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Individual
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold">
                      ₹{transaction.amount.toFixed(2)}
                    </span>
                    <Badge className="capitalize">
                      {transaction.typeOfTransaction}
                    </Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
