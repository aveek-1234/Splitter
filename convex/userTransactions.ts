import { api } from "./_generated/api";
import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

export const getUserTransactions = query({
  handler: async (
    ctx,
  ): Promise<{
    expenses: Array<{
      amount: number;
      paidOrReceived: "paid" | "received";
      isGroup: boolean;
      groupId: Id<"groups"> | null | undefined;
      otherIndividualId: Id<"users"> | null;
      name: string;
      description: string;
      date: number;
      _id: Id<"expenses">;
    }>;
    settlements: Array<{
      amount: number;
      paidOrReceived: "paid" | "received";
      isGroup: boolean;
      groupId: Id<"groups"> | null | undefined;
      otherIndividualId: Id<"users"> | null;
      name: string;
      date: number;
      note?: string;
      _id: Id<"settlements">;
    }>;
  }> => {
    const currentUser = await ctx.runQuery(api.users.getCurrentUser);
    if (!currentUser) {
      throw new Error("Current user not found");
    }

    // Get all expenses where current user is involved (either paid or owes)
    const expenses = await ctx.db.query("expenses").collect();

    const userExpenses = expenses.filter((expense: Doc<"expenses">) => {
      // User paid for this expense
      if (expense.paidByUserId === currentUser._id) {
        return true;
      }

      // User owes money in this expense (in splits)
      return expense.splits.some(
        (split: any) => split.userId === currentUser._id,
      );
    });

    // Get all settlements where current user is involved
    const settlements = await ctx.db.query("settlements").collect();

    const userSettlements = settlements.filter(
      (settlement: Doc<"settlements">) => {
        return (
          settlement.paidByUserId === currentUser._id ||
          settlement.receivedByUserId === currentUser._id
        );
      },
    );

    // Transform expenses data
    const transformedExpenses = await Promise.all(
      userExpenses.map(async (expense: Doc<"expenses">) => {
        const isGroup =
          expense.groupId !== null && expense.groupId !== undefined;
        const userSplit = expense.splits.find(
          (split: any) => split.userId === currentUser._id,
        );

        // Determine if user paid or received
        let paidOrReceived: "paid" | "received";
        let amount: number;

        if (expense.paidByUserId === currentUser._id) {
          // User paid for this expense
          paidOrReceived = "paid";
          // Amount user paid (total expense amount)
          amount = expense.amount;
        } else if (userSplit) {
          // User owes money in this expense
          paidOrReceived = "received";
          // Amount user owes
          amount = userSplit.amount;
        } else {
          // This shouldn't happen, but fallback
          paidOrReceived = "received";
          amount = 0;
        }

        // Get the name
        let name: string;
        let otherIndividualId: Id<"users"> | null = null;
        if (isGroup) {
          const group = await ctx.db.get(expense.groupId!);
          name = group?.name || "Unknown Group";
        } else {
          otherIndividualId =
            expense.splits.find((split) => split.userId !== currentUser._id)
              ?.userId || null;
          const user = otherIndividualId
            ? await ctx.db.get(otherIndividualId)
            : null;
          name = user?.name || "Unknown User";
        }

        return {
          amount,
          paidOrReceived,
          isGroup,
          groupId: isGroup ? expense.groupId : null,
          otherIndividualId,
          name,
          description: expense.description,
          date: expense.date,
          _id: expense._id,
        };
      }),
    );

    // Transform settlements data
    const transformedSettlements = await Promise.all(
      userSettlements.map(async (settlement: Doc<"settlements">) => {
        const isGroup =
          settlement.groupId !== null && settlement.groupId !== undefined;

        // Determine if user paid or received
        let paidOrReceived: "paid" | "received";
        let amount: number;

        if (settlement.paidByUserId === currentUser._id) {
          // User paid this settlement
          paidOrReceived = "paid";
          amount = settlement.amount;
        } else {
          // User received this settlement
          paidOrReceived = "received";
          amount = settlement.amount;
        }

        // Get the name
        let name: string;
        let otherIndividualId: Id<"users"> | null = null;
        if (isGroup) {
          const group = await ctx.db.get(settlement.groupId!);
          name = group?.name || "Unknown Group";
        } else {
          otherIndividualId =
            settlement.paidByUserId === currentUser._id
              ? settlement.receivedByUserId
              : settlement.paidByUserId;
          const user = await ctx.db.get(otherIndividualId);
          name = user?.name || "Unknown User";
        }

        return {
          amount,
          paidOrReceived,
          isGroup,
          groupId: isGroup ? settlement.groupId : null,
          otherIndividualId,
          name,
          date: settlement.date,
          note: settlement.note,
          _id: settlement._id,
        };
      }),
    );

    return {
      expenses: transformedExpenses,
      settlements: transformedSettlements,
    };
  },
});
