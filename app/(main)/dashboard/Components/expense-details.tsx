import { GetTotalSpentResult } from '@/lib/models'
import { months } from '@/lib/constants/months'
import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function ExpenseDetails({ expenses }: { expenses: GetTotalSpentResult | undefined }) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const prepareData= ()=>{
    if(!expenses) return [];
    const { monthlySpent } = expenses;
    return monthlySpent.map((amount, index)=>{
      return {
        month: months[index] || '',
        amount: amount,
      }
    })
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total this month</p>
            <h3 className="text-2xl font-bold mt-1">
              {expenses?.monthlySpent[currentMonth]}
            </h3>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total this year</p>
            <h3 className="text-2xl font-bold mt-1">
              {expenses?.totalSpent}
            </h3>
          </div>
        </div>

        <div className="h-64 mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={prepareData()}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value) => {
                  if (typeof value === "number") {
                    return [`$${value.toFixed(2)}`, "Amount"];
                  }
                  const num = Number(value);
                  return [isNaN(num) ? "$0.00" : `$${num.toFixed(2)}`, "Amount"];
                }}
                labelFormatter={() => "Spending"}
              />
              <Bar dataKey="amount" fill="#36d7b7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          Monthly spending for {currentYear}
        </p>
      </CardContent>
    </Card>
  )
}

export default ExpenseDetails
