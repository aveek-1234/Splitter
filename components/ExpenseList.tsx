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
import { Avatar, AvatarFallback } from '@radix-ui/react-avatar';

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
    return expense.createdBy === currentUser._id || expense.paidByUserId === currentUser._id;
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
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                {CategoryIcon && (
                  <span className="text-xl text-primary">
                    {CategoryIcon && <CategoryIcon/>}
                  </span>
                )}
                <div>
                  <h3>{expense.description}</h3>
                  <div>
                    <span>
                      {format(new Date(expense.date), "MMM d, yyyy")}
                    </span>
                    {showPayerInGroup &&(
                      <span>
                        {payerName} paid
                      </span>
                    )}
                  </div>
                </div>

                </div>
                <div>
                  <div className="text-lg font-semibold">
                    ${expense.amount.toFixed(2)}
                  </div>
                {showDeleteOption && (
                  <button
                    className="ml-2 p-1 rounded hover:bg-red-100 text-red-600"
                    title="Delete expense"
                    onClick={()=>handleDeleteExpense(expense)}
                    // You can implement onClick handler in parent or add here
                  >
                    <Trash className="w-5 h-5" />
                  </button>
                )}
                </div>
                <div className="flex flex-row items-center gap-2">
                  {
                    expense.splits.map((split, id)=>{
                      const splitUser= getPayerName(split.userId);
                      return(
                      <Badge key={id}>
                        <Avatar>
                          <AvatarFallback>
                            {splitUser.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          {splitUser} : <span className="inline-block align-middle ml-1 mr-0.5 text-base">₹ {split.amount.toFixed(2)}</span>
                        </span>
                      </Badge>)
                    })
                  }
                </div>
              </div>
            </CardContent>
          </Card>
         )
      })}
    </div>
  )
}

export default ExpenseList
