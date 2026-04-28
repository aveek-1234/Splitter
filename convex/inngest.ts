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
    console.log("[getUsersWithDebts] Starting execution...");
    
    const users = await ctx.db.query("users").collect();
    console.log("[getUsersWithDebts] Fetched users:", users.length);
    console.log("[getUsersWithDebts] Users:", JSON.stringify(users.map(u => ({ _id: u._id, name: u.name, email: u.email }))));

    const finalResult = [];

    // Load every 1‑to‑1 expense once (groupId === null || groupId === undefined)
    const expenses = await ctx.db
      .query("expenses")
      .filter((q) => q.or(q.eq(q.field("groupId"), null), q.eq(q.field("groupId"), undefined)))
      .collect();
    console.log("[getUsersWithDebts] Fetched expenses:", expenses.length);
    console.log("[getUsersWithDebts] Expenses:", JSON.stringify(expenses.map(e => ({ _id: e._id, amount: e.amount, paidByUserId: e.paidByUserId, splits: e.splits }))));

    // Load every 1‑to‑1 settlement once (groupId === null || groupId === undefined)
    const settlements = await ctx.db
      .query("settlements")
      .filter((q) => q.or(q.eq(q.field("groupId"), null), q.eq(q.field("groupId"), undefined)))
      .collect();
    console.log("[getUsersWithDebts] Fetched settlements:", settlements.length);
    console.log("[getUsersWithDebts] Settlements:", JSON.stringify(settlements.map(s => ({ _id: s._id, amount: s.amount, paidByUserId: s.paidByUserId, receivedByUserId: s.receivedByUserId }))));

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
              groupId?: GenericId<"groups"> | null;
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
              groupId?: GenericId<"groups"> | null;
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
      console.log(`[getUsersWithDebts] Processing user: ${user.name} (${user._id})`);
      
      const ledger = new Map();
      console.log(`[getUsersWithDebts] User ${user.name}: Starting expense processing...`);

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
          console.log(`[getUsersWithDebts] User ${user.name}: Owes ${split.amount} to ${expense.paidByUserId} for expense ${expense._id}`);
        } else {
          for (const s of expense.splits) {
            if (s.userId === user._id || s.paid) continue;

            const entry = ledger.get(s.userId) ?? {
              amount: 0,
              since: expense.date,
            };
            entry.amount -= s.amount;
            ledger.set(s.userId, entry);
            console.log(`[getUsersWithDebts] User ${user.name}: Is owed ${s.amount} from ${s.userId} for expense ${expense._id}`);
          }
        }
      }
      console.log(`[getUsersWithDebts] User ${user.name}: After expense processing, ledger size: ${ledger.size}`);
      console.log(`[getUsersWithDebts] User ${user.name}: Ledger entries:`, JSON.stringify(Array.from(ledger.entries()).map(([k, v]) => ({ userId: k, amount: v.amount, since: v.since }))));

      console.log(`[getUsersWithDebts] User ${user.name}: Starting settlement processing...`);
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
            console.log(`[getUsersWithDebts] User ${user.name}: Settlement paid ${settlement.amount} to ${settlement.receivedByUserId}`);
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
            console.log(`[getUsersWithDebts] User ${user.name}: Settlement received ${settlement.amount} from ${settlement.paidByUserId}`);
          }
        }
      }
      console.log(`[getUsersWithDebts] User ${user.name}: After settlement processing, ledger size: ${ledger.size}`);
      console.log(`[getUsersWithDebts] User ${user.name}: Final ledger entries:`, JSON.stringify(Array.from(ledger.entries()).map(([k, v]) => ({ userId: k, amount: v.amount, since: v.since }))));

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
      console.log(`[getUsersWithDebts] User ${user.name}: Debts collected:`, JSON.stringify(debts));
      
      if(debts.length>0)
      {
        finalResult.push({
          _id:user._id,
          name:user.name,
          email:user.email,
          debts
        })
        console.log(`[getUsersWithDebts] User ${user.name}: Added to final result with ${debts.length} debts`);
      } else {
        console.log(`[getUsersWithDebts] User ${user.name}: No debts, not added to result`);
      }
    }
    console.log("[getUsersWithDebts] Final result:", JSON.stringify(finalResult));
    return finalResult;
  },
});

export const getUsersWithExpenses = query({
  handler: async (ctx)=>{
    const users = await ctx.db.query("users").collect();
    const result= [];

    const dateNow= new Date();
    const prevMonth= new Date(dateNow)
    prevMonth.setMonth(dateNow.getMonth()-1);
    const monthStart = prevMonth.getTime();

    for(const user of users)
    {
      const paidExpenses = await ctx.db
            .query("expenses")
            .withIndex("by_date",(qr)=>qr.gte("date",monthStart))
            .collect();
      
      const allRecentExpenses = await ctx.db
            .query("expenses")
            .withIndex("by_date",(q)=>q.gte("date",monthStart))
            .collect()
      
      const splitExpenses = allRecentExpenses.filter((expense)=>
        expense.splits.some((split)=>split.userId === user._id)
      );

      const userExpenses = [...new Set([...paidExpenses, ...splitExpenses])];

      if(userExpenses.length>0)
      {
        result.push({
          _id:user._id,
          name:user.name,
          email:user.email
        })
      }
    }
    return result;
  }
})

