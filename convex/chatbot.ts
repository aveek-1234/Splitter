import { api } from "./_generated/api";
import { query, type QueryCtx } from "./_generated/server";

type ChatExpense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: number;
  groupId: string | null;
  groupName: string | null;
  paidByMe: boolean;
  myShare: number;
  mySharePaid: boolean;
  splitType: string;
  splitCount: number;
  splits: Array<{ userId: string; amount: number; paid: boolean }>;
};

type ChatSummary = {
  totalSpent: number;
  totalPaidByMe: number;
  totalOwedByMe: number;
  totalOwedToMe: number;
  categoryTotals: Record<string, number>;
};

type ChatContext = {
  user: { name: string; email: string };
  summary: ChatSummary;
  expenses: ChatExpense[];
  settlements: Array<{
    _id: string;
    amount: number;
    date: number;
    paidOrReceived: "paid" | "received";
    isGroup: boolean;
    groupId: string | null | undefined;
    note?: string;
    name: string;
  }>;
};

export const getExpenseChatContext = query({
  handler: async (ctx: QueryCtx): Promise<ChatContext> => {
    const currentUser = await ctx.runQuery(api.users.getCurrentUser);
    const userTransactions = await ctx.runQuery(
      api.userTransactions.getUserTransactions,
    );

    const formattedExpenses: ChatExpense[] = userTransactions.expenses.map(
      (expense) => ({
        id: expense._id,
        description: expense.description,
        amount: expense.amount,
        category: expense.isGroup ? "Group" : "Private",
        date: expense.date,
        groupId: expense.groupId ?? null,
        groupName: expense.isGroup ? expense.name : null,
        paidByMe: expense.paidOrReceived === "paid",
        myShare: expense.paidOrReceived === "received" ? expense.amount : 0,
        mySharePaid: expense.paidOrReceived === "paid",
        splitType: expense.paidOrReceived === "paid" ? "paid" : "owed",
        splitCount: 1,
        splits: [
          {
            userId: currentUser._id,
            amount: expense.amount,
            paid: expense.paidOrReceived === "paid",
          },
        ],
      }),
    );

    const totalSpent = userTransactions.expenses.reduce((sum, expense) => {
      return expense.paidOrReceived === "paid" ? sum + expense.amount : sum;
    }, 0);

    const totalPaidByMe = totalSpent;

    const totalOwedByMe = userTransactions.expenses.reduce((sum, expense) => {
      return expense.paidOrReceived === "received" ? sum + expense.amount : sum;
    }, 0);

    const totalOwedToMe = userTransactions.settlements.reduce(
      (sum, settlement) => {
        return settlement.paidOrReceived === "received"
          ? sum + settlement.amount
          : sum;
      },
      0,
    );

    return {
      user: {
        name: currentUser.name,
        email: currentUser.email,
      },
      summary: {
        totalSpent,
        totalPaidByMe,
        totalOwedByMe,
        totalOwedToMe,
        categoryTotals: {},
      },
      expenses: formattedExpenses,
      settlements: userTransactions.settlements,
    };
  },
});
