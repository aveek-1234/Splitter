import { api } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

type Split = {
  userId: Id<"users">;
  amount: number;
  paid: boolean;
};

type Expense = {
  _id: Id<"expenses">;
  paidByUserId: Id<"users">;
  splits: Split[];
  groupId?: Id<"groups"> | null;
};

type Settlement = {
  _id: Id<"settlements">;
  paidByUserId: Id<"users">;
  receivedByUserId: Id<"users">;
  groupId?: Id<"groups"> | null;
  amount: number;
};

type User = {
  _id: Id<"users">;
  name: string;
  email: string;
  imageUrl?: string;
};

export const getIndividualExpenses = query({
  args: { userId: v.id("users") },
  handler: async (
    ctx: QueryCtx,
    { userId }: { userId: Id<"users"> }
  ): Promise<{
    expensesWhereBothUserOrMeInvolved: Expense[];
    settlementsWhereBothInvolved: Settlement[];
    otherUserDetails: {
      id: Id<"users">;
      name: string;
      email: string;
      imageUrl?: string;
    };
    balance: number;
  }> => {
    const me: User | null = await ctx.runQuery(api.users.getCurrentUser);
    if (!me) throw new Error("Current user not found.");

    if (userId === me._id) {
      throw new Error("Cannot fetch individual expenses for yourself.");
    }

    // Fetch all non-group expenses paid by me
  const iPaid: Expense[] = await ctx.db
  .query("expenses")
  .filter((q) =>
    q.and(
      q.eq(q.field("paidByUserId"), me._id),
      q.or(
        q.eq(q.field("groupId"), undefined),
        q.eq(q.field("groupId"), null)
      )
    )
  )
  .collect();

    // Fetch all non-group expenses paid by other user
  const userPaid: Expense[] = await ctx.db
  .query("expenses")
  .filter((q) =>
    q.and(
      q.eq(q.field("paidByUserId"), userId),
      q.or(
        q.eq(q.field("groupId"), undefined),
        q.eq(q.field("groupId"), null)
      )
    )
  )
  .collect();

    const totalExpenses: Expense[] = [...iPaid, ...userPaid];

    const expensesWhereBothUserOrMeInvolved: Expense[] = totalExpenses.filter((expense: Expense) => {
      const paidByEither =
        expense.paidByUserId.toString() === me._id.toString() ||
        expense.paidByUserId.toString() === userId.toString();
      const involvedUserIds = expense.splits.map((split: Split) => split.userId.toString());
      const bothInSplits =
        involvedUserIds.includes(me._id.toString()) &&
        involvedUserIds.includes(userId.toString());
      return paidByEither && bothInSplits;
    });

    // Get all non-group settlements where either me or userId is paidByUserId or receivedByUserId
    const settlements: Settlement[] = await ctx.db
      .query("settlements")
      .filter((q) =>
        // Only non-group settlements (groupId is undefined or null)
        (q.eq(q.field("groupId"), undefined) || q.eq(q.field("groupId"), null)) &&
        (
          q.eq(q.field("paidByUserId"), me._id) ||
          q.eq(q.field("paidByUserId"), userId) ||
          q.eq(q.field("receivedByUserId"), me._id) ||
          q.eq(q.field("receivedByUserId"), userId)
        )
      )
      .collect();

    const settlementsWhereBothInvolved: Settlement[] = settlements.filter((settlement: Settlement) => {
      // Consider a settlement "involving both" if both user ids appear
      const participants = [
        settlement.paidByUserId.toString(),
        settlement.receivedByUserId.toString(),
      ];
      return (
        participants.includes(me._id.toString()) &&
        participants.includes(userId.toString())
      );
    });

    // Compute balance
    let balance = 0;

    for (const expense of expensesWhereBothUserOrMeInvolved) {
      const isMePayer = expense.paidByUserId.toString() === me._id.toString();
      const isUserPayer = expense.paidByUserId.toString() === userId.toString();

      const meSplit = expense.splits.find(
        (s: Split) => s.userId.toString() === me._id.toString()
      );
      const userSplit = expense.splits.find(
        (s: Split) => s.userId.toString() === userId.toString()
      );

      if (isMePayer && userSplit && !userSplit.paid) {
        balance += userSplit.amount;
      } else if (isUserPayer && meSplit && !meSplit.paid) {
        balance -= meSplit.amount;
      }
    }

    for (const settlement of settlementsWhereBothInvolved) {
      if (
        settlement.paidByUserId.toString() === userId.toString() &&
        settlement.receivedByUserId.toString() === me._id.toString()
      ) {
        // userId paid me => user paid their debt
        balance -= settlement.amount;
      } else if (
        settlement.paidByUserId.toString() === me._id.toString() &&
        settlement.receivedByUserId.toString() === userId.toString()
      ) {
        // I paid userId (settling my debt)
        balance += settlement.amount;
      }
    }

    

    const userDetails: User | null = await ctx.db.get(userId);

    if (!userDetails) {
      throw new Error("User Not found");
    }

    return {
      expensesWhereBothUserOrMeInvolved,
      settlementsWhereBothInvolved,
      otherUserDetails: {
        id: userDetails._id,
        name: userDetails.name,
        email: userDetails.email,
        imageUrl: userDetails.imageUrl,
      },
      balance,
    };
  },
});

/**
 * deleteExpense
 *
 * Deletes an expense by its id.
 * Only the payer of the expense can delete it.
 */
export const deleteExpense = mutation({
  args: {
    expenseId: v.id("expenses"),
  },
  handler: async (ctx, { expenseId }) => {
    // Get the current user
    const currentUser = await ctx.runQuery(api.users.getCurrentUser);

    // Fetch the expense
    const expense = await ctx.db.get(expenseId);
    if (!expense) {
      throw new Error("Expense not found");
    }

    // Only the payer can delete the expense
    if (expense.paidByUserId.toString() !== currentUser._id.toString()) {
      throw new Error("You can only delete expenses you paid for.");
    }

    // Delete the expense
    await ctx.db.delete(expenseId);

    return { success: true };
  },
});

