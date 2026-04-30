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
      <CardContent className='space-y-4'>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground">This month</p>
            <h3 className="text-lg font-bold mt-1">
              ₹{expenses?.monthlySpent[currentMonth]?.toFixed(2) ?? "0.00"}
            </h3>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground">This year</p>
            <h3 className="text-lg font-bold mt-1">
              ₹{expenses?.totalSpent?.toFixed(2) ?? "0.00"}
            </h3>
          </div>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={prepareData()} margin={{ top: 5, right: 10, left: 60, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                width={50}
                label={{
                  value: "Spending in Rupees (₹)",
                  angle: -90,
                  position: "left",
                  dx: -10,
                  style: { textAnchor: "middle", fontSize: 12 },
                }}
              />
              <Tooltip
                formatter={(value) => {
                  if (typeof value === "number") {
                    return [`₹${value.toFixed(2)}`, "Amount"];
                  }
                  const num = Number(value);
                  return [isNaN(num) ? "₹0.00" : `₹${num.toFixed(2)}`, "Amount"];
                }}
                labelFormatter={() => "Spending"}
              />
              <Bar dataKey="amount" fill="#36d7b7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Spending by month - {currentYear}
        </p>
      </CardContent>
    </Card>
  )
}

export default ExpenseDetails
