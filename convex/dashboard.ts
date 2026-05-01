import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type {
  User,
  UserBalanceSummary,
  GetUserBalancesResult,
  GetTotalSpentResult,
  GroupWithBalance,
} from "../lib/models/index";

/**
 * Fetches all one-on-one expenses for the current user
 * Returns expenses where the user either paid or owes money
 */
export const getUserBalances = query({
  handler: async (ctx: QueryCtx): Promise<GetUserBalancesResult> => {
    const user = await ctx.runQuery(api.users.getCurrentUser);

    // Filter expenses to only include one-on-one settlements (no group expenses)
    // and where user is either the payer or a participant in the split
    const expenses = (await ctx.db.query("expenses").collect()).filter(
      (exp) =>
        !exp.groupId &&
        (exp.paidByUserId === user._id ||
          exp.splits.some((split) => split.userId === user._id)),
    );
    let userOwe: number = 0;
    let userIsOwed: number = 0;
    const balanceofTheUserWithOthers: Record<
      Id<"users">,
      { userOwe: number; userIsOwed: number }
    > = {} as Record<Id<"users">, { userOwe: number; userIsOwed: number }>;

    for (const expense of expenses) {
      if (expense.paidByUserId === user._id) {
        // User paid for the expense
        for (const split of expense.splits) {
          if (split.userId !== user._id && !split.paid) {
            userIsOwed += split.amount;
            (balanceofTheUserWithOthers[split.userId] ??= {
              userOwe: 0,
              userIsOwed: 0,
            }).userIsOwed += split.amount;
          }
        }
      } else {
        // User owes money
        const userSplit = expense.splits.find(
          (split) => split.userId === user._id,
        );
        if (userSplit && !userSplit.paid) {
          userOwe += userSplit.amount;
          (balanceofTheUserWithOthers[expense.paidByUserId] ??= {
            userOwe: 0,
            userIsOwed: 0,
          }).userOwe += userSplit.amount;
        }
      }
    }

    const settlements = (await ctx.db.query("settlements").collect()).filter(
      (settlement) =>
        !settlement.groupId &&
        (settlement.paidByUserId === user._id ||
          settlement.receivedByUserId === user._id),
    );

    for (const settlement of settlements) {
      if (settlement.paidByUserId === user._id) {
        userOwe -= settlement.amount;
        (balanceofTheUserWithOthers[settlement.receivedByUserId] ??= {
          userOwe: 0,
          userIsOwed: 0,
        }).userOwe -= settlement.amount;
      } else {
        userIsOwed -= settlement.amount;
        (balanceofTheUserWithOthers[settlement.paidByUserId] ??= {
          userOwe: 0,
          userIsOwed: 0,
        }).userIsOwed -= settlement.amount;
      }
    }

    const userOwesList: UserBalanceSummary[] = [];
    const userIsOwedList: UserBalanceSummary[] = [];

    for (const [userId, balance] of Object.entries(
      balanceofTheUserWithOthers,
    ) as [Id<"users">, { userOwe: number; userIsOwed: number }][]) {
      const netBalance: number = balance.userOwe - balance.userIsOwed;
      if (netBalance < 0) continue;
      const userDetails = await ctx.db.get(userId);
      const userBase: UserBalanceSummary = {
        userId,
        name: userDetails?.name,
        email: userDetails?.email,
        imageUrl: userDetails?.imageUrl,
        netBalance,
      };
      if (netBalance > 0) {
        userOwesList.push(userBase);
      } else {
        userIsOwedList.push(userBase);
      }
    }

    return {
      userOwe: userOwe > 0 ? userOwe : 0,
      userIsOwed: userIsOwed > 0 ? userIsOwed : 0,
      owingDetails: { userOwe: userOwesList, userIsOwed: userIsOwedList },
    };
  },
});

export const getTotalSpent = query({
  handler: async (ctx: QueryCtx): Promise<GetTotalSpentResult> => {
    const user = await ctx.runQuery(api.users.getCurrentUser);
    let totalSpent: number = 0;
    const monthlySpent: number[] = Array(12).fill(0) as number[];

    const currentYear: number = new Date().getFullYear();
    const startYear: number = new Date(currentYear, 0, 1).getTime();

    const userExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_date", (q) => q.gte("date", startYear))
      .collect();

    const filteredExpenses = userExpenses.filter(
      (exp) =>
        exp.paidByUserId === user._id ||
        exp.splits.some((split) => split.userId === user._id),
    );

    for (const expense of filteredExpenses) {
      if (expense.paidByUserId === user._id) {
        totalSpent += expense.amount;
        const expenseDate: Date = new Date(expense.date);
        const monthIndex: number = expenseDate.getMonth();
        monthlySpent[monthIndex] += expense.amount;
      }
    }

    return { totalSpent, monthlySpent };
  },
});

export const getGroupExpenses = query({
  handler: async (ctx: QueryCtx): Promise<GroupWithBalance[]> => {
    const user: User = await ctx.runQuery(api.users.getCurrentUser);
    const allGroups: Doc<"groups">[] = await ctx.db.query("groups").collect();
    const userGroups: Doc<"groups">[] = allGroups.filter((group) =>
      group.members.some((member) => member.userId === user._id),
    );

    const groupDetailsWithExpenses: GroupWithBalance[] = await Promise.all(
      userGroups.map(async (group): Promise<GroupWithBalance> => {
        const expenses = await ctx.db
          .query("expenses")
          .withIndex("by_group", (q) => q.eq("groupId", group._id))
          .collect();
        let balance: number = 0;
        for (const expense of expenses) {
          if (expense.paidByUserId === user._id) {
            expense.splits.forEach((split) => {
              if (split.userId !== user._id && !split.paid) {
                balance += split.amount;
              }
            });
          } else {
            const userSplit = expense.splits.find(
              (split) => split.userId === user._id,
            );
            if (userSplit && !userSplit.paid) {
              balance -= userSplit.amount;
            }
          }
        }
        const settlements = await ctx.db
          .query("settlements")
          .withIndex("by_group", (q) => q.eq("groupId", group._id))
          .collect();
        const settlementsRegardingUser = settlements.filter(
          (settlement) =>
            settlement.paidByUserId === user._id ||
            settlement.receivedByUserId === user._id,
        );
        for (const settlement of settlementsRegardingUser) {
          if (settlement.paidByUserId === user._id) {
            balance += settlement.amount;
          } else {
            balance -= settlement.amount;
          }
        }
        return { ...group, id: group._id, balance } as GroupWithBalance;
      }),
    );
    return groupDetailsWithExpenses;
  },
});
