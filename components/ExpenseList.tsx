import { api } from '@/convex/_generated/api';
import { useFetchQuery } from '@/hooks/useFetchQuery';
import { useMutateQuery } from '@/hooks/useMutateQuery';
import { Expense, GroupMemberDetail, OtherUserDetails, User } from '@/lib/models';
import React from 'react'
import { Card, CardContent } from './ui/card';
import { getCategoryById, getCategoryIconById } from '@/lib/expenseCategory';
import { format } from 'date-fns/format';
import { Badge, Trash } from 'lucide-react';
import { toast } from 'sonner';
import { Id } from '@/convex/_generated/dataModel';

type ExpenseDetailsProps = {
  expenses: Expense[];
  showPayerInGroup: boolean;
  otherPersonID: string;
  isGroupExpense?: boolean;
  userLookupMap: { [key: string]: OtherUserDetails } | Record<string, GroupMemberDetail | null>;
}

function ExpenseList(
  {
    expenses,
    showPayerInGroup,
    otherPersonID,
    isGroupExpense=false,
    userLookupMap,
  }: ExpenseDetailsProps
) {
   
   const { data: currentUser }: { data?: User } = useFetchQuery(api.users.getCurrentUser);
   const deleteExpense = useMutateQuery(api.individualExpenses.deleteExpense);

   console.log(expenses);
   

  if (!expenses || expenses.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No Expenses found
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  function getPayerName(id:string)
  {
     return id===currentUser?._id ? "You" : userLookupMap[id]?.name|| "Other user"
  }

  function canDeleteExpense(expense: Expense): boolean {
    if (!currentUser) return false;
    return  expense.paidByUserId === currentUser._id;
  }

  async function handleDeleteExpense(expense: Expense){
    const confirmed = window.confirm("Are You sure to delete it? it cannot be reverted");
    if(!confirmed)
    {
      return;
    }
    try {
      await deleteExpense.mutate({expenseId:expense._id as Id<"expenses">})
    } catch (error) {
      toast.error("Failed to delete expense")
    }
  }
  return (
    <div>
      {expenses.map((expense:Expense)=>{;
      
         const payerName = getPayerName(expense.paidByUserId);
         const category = getCategoryById(expense.category);
         const showDeleteOption = canDeleteExpense(expense);
         const CategoryIcon= getCategoryIconById(expense.category);
         return (
          <Card key={expense._id}>
            <CardContent >
              <div className='flex items-center justify-between gap-4'>
                <div className='flex items-center gap-3 flex-1'>
                {CategoryIcon && (
                  <span className="text-xl text-primary">
                    {CategoryIcon && <CategoryIcon/>}
                  </span>
                )}
                <div>
                  <h3>{expense.description}</h3>
                  <div className="text-sm text-gray-600">
                    <span>
                      {format(new Date(expense.date), "MMM d, yyyy")}
                    </span>
                    {showPayerInGroup &&(
                      <span className="ml-2">
                        {payerName} paid
                      </span>
                    )}
                  </div>
                </div>

                </div>
                <div className="text-lg font-semibold shrink-0">
                  ₹{expense.amount.toFixed(2)}
                </div>
                {showDeleteOption && (
                  <button
                    className="p-1 rounded hover:bg-red-100 text-red-600 shrink-0"
                    title="Delete expense"
                    onClick={()=>handleDeleteExpense(expense)}
                  >
                    <Trash className="w-5 h-5" />
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
         )
      })}
    </div>
  )
}

export default ExpenseList
