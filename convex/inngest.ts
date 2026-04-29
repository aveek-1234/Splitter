import { TableNamesInDataModel } from "convex/server";
import { query } from "./_generated/server";
import { GenericId, v } from "convex/values";

// Place the handler within the query definition for getUserMonthlyExpenses
export const getUserMonthlyExpenses = query({
  args: { userId: v.id("users") },
  handler: async (ctx: any, { userId }: { userId: GenericId<"users"> }) => {
    const now = new Date();
    const prevMonth = new Date(now);
    prevMonth.setMonth(now.getMonth() - 1);
    const monthStart = prevMonth.getTime();

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_date", (q: any) => q.gte("date", monthStart))
      .collect();

    const userExpenses = expenses.filter(
      (expense: any) =>
        expense.paidByUserId === userId ||
        expense.splits.some((split: any) => split.userId === userId),
    );

    let totalPaid = 0;
    let totalOwed = 0;

    const detailedExpenses = userExpenses.map((expense: any) => {
      const isPayer = expense.paidByUserId === userId;
      const userSplit = expense.splits.find((s: any) => s.userId === userId);

      const paidAmount = isPayer ? expense.amount : 0;
      const owedAmount = userSplit ? userSplit.amount : 0;

      totalPaid += paidAmount;
      totalOwed += owedAmount;

      return {
        _id: expense._id,
        description: expense.description,
        category: expense.category,
        date: expense.date,
        amount: expense.amount,
        paidAmount,
        owedAmount,
        isPayer,
        groupId: expense.groupId,
      };
    });

    return {
      userId,
      totalPaid,
      totalOwed,
      net: totalPaid - totalOwed,
      expenses: detailedExpenses,
    };
  },
});

export const getUsersWithDebts = query({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const finalResult = [];

    // Load every 1‑to‑1 expense once (groupId === undefined)
    const expenses = await ctx.db
      .query("expenses")
      .filter((q) => q.eq(q.field("groupId"), null))
      .collect();

    // Load every 1‑to‑1 settlement once (groupId === undefined)
    const settlements = await ctx.db
      .query("settlements")
      .filter((q) => q.eq(q.field("groupId"), null))
      .collect();

    const userCache = new Map();
    const getUser = async (
      id: GenericId<
        TableNamesInDataModel<{
          users: {
            document: {
              _id: GenericId<"users">;
              _creationTime: number;
              imageUrl?: string | undefined;
              name: string;
              email: string;
              tokenId: string;
            };
            fieldPaths:
              | ("name" | "email" | "tokenId" | "imageUrl" | "_creationTime")
              | "_id";
            indexes: {
              by_token: ["tokenId", "_creationTime"];
              by_email: ["email", "_creationTime"];
              by_id: ["_id"];
              by_creation_time: ["_creationTime"];
            };
            searchIndexes: {
              search_name: { searchField: "name"; filterFields: never };
              search_email: { searchField: "email"; filterFields: never };
            };
            vectorIndexes: {};
          };
          groups: {
            document: {
              _id: GenericId<"groups">;
              _creationTime: number;
              description?: string | undefined;
              name: string;
              createdBy: GenericId<"users">;
              members: {
                userId: GenericId<"users">;
                role: string;
                joinedAt: number;
              }[];
            };
            fieldPaths:
              | "_id"
              | (
                  | "name"
                  | "_creationTime"
                  | "description"
                  | "createdBy"
                  | "members"
                );
            indexes: { by_id: ["_id"]; by_creation_time: ["_creationTime"] };
            searchIndexes: {};
            vectorIndexes: {};
          };
          expenses: {
            document: {
              _id: GenericId<"expenses">;
              _creationTime: number;
              category?: string | undefined;
              groupId?: GenericId<"groups"> | undefined;
              description: string;
              amount: number;
              date: number;
              paidByUserId: GenericId<"users">;
              splitType: string;
              splits: {
                amount: number;
                userId: GenericId<"users">;
                paid: boolean;
              }[];
              createdBy: GenericId<"users">;
            };
            fieldPaths:
              | (
                  | "_creationTime"
                  | "description"
                  | "amount"
                  | "category"
                  | "date"
                  | "paidByUserId"
                  | "splitType"
                  | "splits"
                  | "groupId"
                  | "createdBy"
                )
              | "_id";
            indexes: {
              by_group: ["groupId", "_creationTime"];
              by_user_and_group: ["paidByUserId", "groupId", "_creationTime"];
              by_date: ["date", "_creationTime"];
              by_id: ["_id"];
              by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
          };
          settlements: {
            document: {
              _id: GenericId<"settlements">;
              _creationTime: number;
              groupId?: GenericId<"groups"> | undefined;
              note?: string | undefined;
              relatedExpenseIds?: GenericId<"expenses">[] | undefined;
              amount: number;
              date: number;
              paidByUserId: GenericId<"users">;
              createdBy: GenericId<"users">;
              receivedByUserId: GenericId<"users">;
            };
            fieldPaths:
              | (
                  | "_creationTime"
                  | "amount"
                  | "date"
                  | "paidByUserId"
                  | "groupId"
                  | "createdBy"
                  | "note"
                  | "receivedByUserId"
                  | "relatedExpenseIds"
                )
              | "_id";
            indexes: {
              by_group: ["groupId", "_creationTime"];
              by_user_and_group: ["paidByUserId", "groupId", "_creationTime"];
              by_receiver_and_group: [
                "receivedByUserId",
                "groupId",
                "_creationTime",
              ];
              by_date: ["date", "_creationTime"];
              by_id: ["_id"];
              by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
          };
        }>
      >,
    ) => {
      if (!userCache.has(id)) userCache.set(id, await ctx.db.get(id));
      return userCache.get(id);
    };

    for (const user of users) {
      const ledger = new Map();

      for (const expense of expenses) {
        if (expense.paidByUserId !== user._id) {
          const split = expense.splits.find(
            (s) => s.userId === user._id && !s.paid,
          );
          if (!split) continue;

          const entry = ledger.get(expense.paidByUserId) ?? {
            amount: 0,
            since: expense.date,
          };
          entry.amount += split.amount;
          entry.since = Math.min(entry.since, expense.date);
          ledger.set(expense.paidByUserId, entry);
        } else {
          for (const s of expense.splits) {
            if (s.userId === user._id || s.paid) continue;

            const entry = ledger.get(s.userId) ?? {
              amount: 0,
              since: expense.date,
            };
            entry.amount -= s.amount;
            ledger.set(s.userId, entry);
          }
        }
      }

      for (const settlement of settlements) {
        if (settlement.paidByUserId === user._id) {
          const entry = ledger.get(settlement.receivedByUserId);
          if (entry) {
            entry.amount -= settlement.amount;
            if (entry.amount === 0) {
              ledger.delete(settlement.receivedByUserId);
            } else {
              ledger.set(settlement.receivedByUserId, entry);
            }
          }
        } else if (settlement.receivedByUserId === user._id) {
          const entry = ledger.get(settlement.paidByUserId);
          if (entry) {
            entry.amount -= settlement.amount;
            if (entry.amount === 0) {
              ledger.delete(settlement.receivedByUserId);
            } else {
              ledger.set(settlement.receivedByUserId, entry);
            }
          }
        }
      }
      const debts = [];

      for (const [userId, { amount, date }] of ledger) {
        if (amount > 0) {
          const user = await getUser(userId);
          debts.push({
            userId,
            name: user?.name ?? "Unknown User",
            amount,
            date,
          });
        }
      }
      if (debts.length > 0) {
        finalResult.push({
          _id: user._id,
          name: user.name,
          email: user.email,
          debts,
        });
      }
    }
    return finalResult;
  },
});

export const getUsersWithExpenses = query({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const result = [];

    const dateNow = new Date();
    const prevMonth = new Date(dateNow);
    prevMonth.setMonth(dateNow.getMonth() - 1);
    const monthStart = prevMonth.getTime();

    for (const user of users) {
      const paidExpenses = await ctx.db
        .query("expenses")
        .withIndex("by_date", (qr) => qr.gte("date", monthStart))
        .collect();

      const allRecentExpenses = await ctx.db
        .query("expenses")
        .withIndex("by_date", (q) => q.gte("date", monthStart))
        .collect();

      const splitExpenses = allRecentExpenses.filter((expense) =>
        expense.splits.some((split) => split.userId === user._id),
      );

      const userExpenses = [...new Set([...paidExpenses, ...splitExpenses])];

      if (userExpenses.length > 0) {
        result.push({
          _id: user._id,
          name: user.name,
          email: user.email,
        });
      }
    }
    return result;
  },
});
