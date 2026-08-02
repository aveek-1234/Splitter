import { v } from "convex/values";
import { api } from "./_generated/api";
import { query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

type ChatSplit = {
  userId: string;
  userName: string;
  amount: number;
  paid: boolean;
};

type ChatExpense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: number;
  groupId: string | null;
  groupName: string | null;
  paidByUserId: string;
  paidByName: string;
  splits: ChatSplit[];
};

type ChatSettlement = {
  id: string;
  amount: number;
  date: number;
  note?: string;
  paidByUserId: string;
  paidByName: string;
  receivedByUserId: string;
  receivedByName: string;
  isGroup: boolean;
  groupId: string | null;
  groupName: string | null;
  directionForUser: "paid" | "received";
  counterpartyName: string;
};

type ChatBalance = {
  counterpartyId: string;
  counterpartyName: string;
  netBalance: number;
  interpretation: string;
};

type ChatSummary = {
  totalSpent: number;
  totalPaidByMe: number;
  totalOwedByMe: number;
  totalOwedToMe: number;
  categoryTotals: Record<string, number>;
};

export type ChatContext = {
  user: { id: string; name: string; email: string };
  summary: ChatSummary;
  expenses: ChatExpense[];
  settlements: ChatSettlement[];
  balances: ChatBalance[];
};

type UserMap = Map<Id<"users">, Doc<"users">>;
type GroupMap = Map<Id<"groups">, Doc<"groups">>;

function userName(userById: UserMap, userId: Id<"users">): string {
  return userById.get(userId)?.name ?? "Unknown user";
}

function computePrivateBalances(
  currentUserId: Id<"users">,
  expenses: Doc<"expenses">[],
  settlements: Doc<"settlements">[],
  userById: UserMap,
): ChatBalance[] {
  const ledger = new Map<Id<"users">, number>();

  for (const expense of expenses) {
    if (expense.groupId) {
      continue;
    }

    const payerId = expense.paidByUserId;

    for (const split of expense.splits) {
      if (split.userId === payerId || split.paid) {
        continue;
      }

      if (payerId === currentUserId) {
        ledger.set(
          split.userId,
          (ledger.get(split.userId) ?? 0) + split.amount,
        );
      } else if (split.userId === currentUserId) {
        ledger.set(payerId, (ledger.get(payerId) ?? 0) - split.amount);
      }
    }
  }

  for (const settlement of settlements) {
    if (settlement.groupId) {
      continue;
    }

    const paidBy = settlement.paidByUserId;
    const receivedBy = settlement.receivedByUserId;

    if (receivedBy === currentUserId) {
      ledger.set(paidBy, (ledger.get(paidBy) ?? 0) - settlement.amount);
    } else if (paidBy === currentUserId) {
      ledger.set(receivedBy, (ledger.get(receivedBy) ?? 0) + settlement.amount);
    }
  }

  return Array.from(ledger.entries())
    .filter(([, balance]) => balance !== 0)
    .map(([counterpartyId, netBalance]) => ({
      counterpartyId,
      counterpartyName: userName(userById, counterpartyId),
      netBalance,
      interpretation:
        netBalance > 0
          ? `${userName(userById, counterpartyId)} owes you ${netBalance}`
          : `You owe ${userName(userById, counterpartyId)} ${Math.abs(netBalance)}`,
    }));
}

async function buildChatExpenses(
  expenses: Doc<"expenses">[],
  currentUserId: Id<"users">,
  userById: UserMap,
  groupById: GroupMap,
): Promise<ChatExpense[]> {
  return expenses.map((expense) => {
    const group = expense.groupId ? groupById.get(expense.groupId) : undefined;

    return {
      id: expense._id,
      description: expense.description,
      amount: expense.amount,
      category: expense.category ?? "Uncategorized",
      date: expense.date,
      groupId: expense.groupId ?? null,
      groupName: group?.name ?? null,
      paidByUserId: expense.paidByUserId,
      paidByName: userName(userById, expense.paidByUserId),
      splits: expense.splits.map((split) => ({
        userId: split.userId,
        userName: userName(userById, split.userId),
        amount: split.amount,
        paid: split.paid,
      })),
    };
  });
}

async function buildChatSettlements(
  settlements: Doc<"settlements">[],
  currentUserId: Id<"users">,
  userById: UserMap,
  groupById: GroupMap,
): Promise<ChatSettlement[]> {
  return settlements.map((settlement) => {
    const isGroup = settlement.groupId != null && settlement.groupId !== undefined;
    const group = isGroup ? groupById.get(settlement.groupId!) : undefined;
    const paidByName = userName(userById, settlement.paidByUserId);
    const receivedByName = userName(userById, settlement.receivedByUserId);
    const directionForUser =
      settlement.paidByUserId === currentUserId ? "paid" : "received";
    const counterpartyId =
      settlement.paidByUserId === currentUserId
        ? settlement.receivedByUserId
        : settlement.paidByUserId;

    return {
      id: settlement._id,
      amount: settlement.amount,
      date: settlement.date,
      note: settlement.note,
      paidByUserId: settlement.paidByUserId,
      paidByName,
      receivedByUserId: settlement.receivedByUserId,
      receivedByName,
      isGroup,
      groupId: isGroup ? settlement.groupId! : null,
      groupName: group?.name ?? null,
      directionForUser,
      counterpartyName: userName(userById, counterpartyId),
    };
  });
}

function computeSummary(
  expenses: Doc<"expenses">[],
  balances: ChatBalance[],
  currentUserId: Id<"users">,
): ChatSummary {
  const totalSpent = expenses.reduce((sum, expense) => {
    return expense.paidByUserId === currentUserId
      ? sum + expense.amount
      : sum;
  }, 0);

  const totalPaidByMe = totalSpent;

  const totalOwedByMe = balances.reduce((sum, balance) => {
    return balance.netBalance < 0 ? sum + Math.abs(balance.netBalance) : sum;
  }, 0);

  const totalOwedToMe = balances.reduce((sum, balance) => {
    return balance.netBalance > 0 ? sum + balance.netBalance : sum;
  }, 0);

  const categoryTotals: Record<string, number> = {};
  for (const expense of expenses) {
    const category = expense.category ?? "Uncategorized";
    const userSplit = expense.splits.find(
      (split) => split.userId === currentUserId,
    );
    const attributedAmount =
      expense.paidByUserId === currentUserId
        ? expense.amount
        : (userSplit?.amount ?? 0);
    categoryTotals[category] =
      (categoryTotals[category] ?? 0) + attributedAmount;
  }

  return {
    totalSpent,
    totalPaidByMe,
    totalOwedByMe,
    totalOwedToMe,
    categoryTotals,
  };
}

type LoadedUserChatData = {
  currentUser: Doc<"users">;
  userById: UserMap;
  groupById: GroupMap;
  userExpenses: Doc<"expenses">[];
  userSettlements: Doc<"settlements">[];
};

async function loadUserChatData(ctx: QueryCtx): Promise<LoadedUserChatData> {
  const currentUser = await ctx.runQuery(api.users.getCurrentUser);

  const [users, groups, allExpenses, allSettlements] = await Promise.all([
    ctx.db.query("users").collect(),
    ctx.db.query("groups").collect(),
    ctx.db.query("expenses").collect(),
    ctx.db.query("settlements").collect(),
  ]);

  const userById: UserMap = new Map(users.map((user) => [user._id, user]));
  const groupById: GroupMap = new Map(groups.map((group) => [group._id, group]));

  const userExpenses = allExpenses.filter((expense) => {
    if (expense.paidByUserId === currentUser._id) {
      return true;
    }

    return expense.splits.some((split) => split.userId === currentUser._id);
  });

  const userSettlements = allSettlements.filter(
    (settlement) =>
      settlement.paidByUserId === currentUser._id ||
      settlement.receivedByUserId === currentUser._id,
  );

  return {
    currentUser,
    userById,
    groupById,
    userExpenses,
    userSettlements,
  };
}

function monthRangeMs(month: string): { start: number; end: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (!Number.isFinite(year) || monthIndex < 0 || monthIndex > 11) {
    return null;
  }

  const start = Date.UTC(year, monthIndex, 1);
  const end = Date.UTC(year, monthIndex + 1, 1) - 1;
  return { start, end };
}

function filterExpensesByArgs(
  expenses: Doc<"expenses">[],
  groupById: GroupMap,
  args: {
    category?: string;
    month?: string;
    groupName?: string;
    limit?: number;
    maxLimit?: number;
  },
): Doc<"expenses">[] {
  let filtered = expenses;

  if (args.category) {
    const category = args.category.trim().toLowerCase();
    filtered = filtered.filter(
      (expense) =>
        (expense.category ?? "Uncategorized").toLowerCase() === category,
    );
  }

  if (args.month) {
    const range = monthRangeMs(args.month);
    if (range) {
      filtered = filtered.filter(
        (expense) => expense.date >= range.start && expense.date <= range.end,
      );
    }
  }

  if (args.groupName) {
    const groupName = args.groupName.trim().toLowerCase();
    filtered = filtered.filter((expense) => {
      if (!expense.groupId) {
        return groupName === "private" || groupName === "none";
      }
      const group = groupById.get(expense.groupId);
      return (group?.name ?? "").toLowerCase().includes(groupName);
    });
  }

  filtered = [...filtered].sort((a, b) => b.date - a.date);

  const maxLimit = args.maxLimit && args.maxLimit > 0 ? args.maxLimit : 100;
  const limit =
    args.limit && args.limit > 0 ? Math.min(args.limit, maxLimit) : 50;
  return filtered.slice(0, limit);
}

export const getExpenseChatContext = query({
  handler: async (ctx: QueryCtx): Promise<ChatContext> => {
    const {
      currentUser,
      userById,
      groupById,
      userExpenses,
      userSettlements,
    } = await loadUserChatData(ctx);

    const expenses = await buildChatExpenses(
      userExpenses,
      currentUser._id,
      userById,
      groupById,
    );
    const settlements = await buildChatSettlements(
      userSettlements,
      currentUser._id,
      userById,
      groupById,
    );
    const balances = computePrivateBalances(
      currentUser._id,
      userExpenses,
      userSettlements,
      userById,
    );
    const summary = computeSummary(userExpenses, balances, currentUser._id);

    return {
      user: {
        id: currentUser._id,
        name: currentUser.name,
        email: currentUser.email,
      },
      summary,
      expenses,
      settlements,
      balances,
    };
  },
});

export const getBalancesForCurrentUser = query({
  handler: async (ctx: QueryCtx) => {
    const { currentUser, userById, userExpenses, userSettlements } =
      await loadUserChatData(ctx);

    const balances = computePrivateBalances(
      currentUser._id,
      userExpenses,
      userSettlements,
      userById,
    );

    return {
      user: {
        id: currentUser._id,
        name: currentUser.name,
      },
      balances,
      totalOwedByMe: balances.reduce(
        (sum, balance) =>
          balance.netBalance < 0 ? sum + Math.abs(balance.netBalance) : sum,
        0,
      ),
      totalOwedToMe: balances.reduce(
        (sum, balance) =>
          balance.netBalance > 0 ? sum + balance.netBalance : sum,
        0,
      ),
    };
  },
});

export const getSpendingSummaryForCurrentUser = query({
  args: {
    month: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const {
      currentUser,
      userById,
      groupById,
      userExpenses,
      userSettlements,
    } = await loadUserChatData(ctx);

    const filteredExpenses = filterExpensesByArgs(userExpenses, groupById, {
      month: args.month,
      category: args.category,
      limit: userExpenses.length || 1,
      maxLimit: Math.max(userExpenses.length, 1),
    });

    const balances = computePrivateBalances(
      currentUser._id,
      userExpenses,
      userSettlements,
      userById,
    );
    const summary = computeSummary(
      filteredExpenses,
      balances,
      currentUser._id,
    );

    return {
      user: {
        id: currentUser._id,
        name: currentUser.name,
      },
      filters: {
        month: args.month ?? null,
        category: args.category ?? null,
      },
      expenseCount: filteredExpenses.length,
      summary,
      balances,
    };
  },
});

export const listExpensesForCurrentUser = query({
  args: {
    category: v.optional(v.string()),
    month: v.optional(v.string()),
    groupName: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { currentUser, userById, groupById, userExpenses } =
      await loadUserChatData(ctx);

    const filtered = filterExpensesByArgs(userExpenses, groupById, {
      category: args.category,
      month: args.month,
      groupName: args.groupName,
      limit: args.limit,
    });

    const expenses = await buildChatExpenses(
      filtered,
      currentUser._id,
      userById,
      groupById,
    );

    return {
      user: {
        id: currentUser._id,
        name: currentUser.name,
      },
      filters: {
        category: args.category ?? null,
        month: args.month ?? null,
        groupName: args.groupName ?? null,
        limit: args.limit ?? 50,
      },
      count: expenses.length,
      expenses,
    };
  },
});

export const listSettlementsForCurrentUser = query({
  args: {
    month: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { currentUser, userById, groupById, userSettlements } =
      await loadUserChatData(ctx);

    let filtered = userSettlements;

    if (args.month) {
      const range = monthRangeMs(args.month);
      if (range) {
        filtered = filtered.filter(
          (settlement) =>
            settlement.date >= range.start && settlement.date <= range.end,
        );
      }
    }

    filtered = [...filtered].sort((a, b) => b.date - a.date);
    const limit = args.limit && args.limit > 0 ? Math.min(args.limit, 100) : 50;
    filtered = filtered.slice(0, limit);

    const settlements = await buildChatSettlements(
      filtered,
      currentUser._id,
      userById,
      groupById,
    );

    return {
      user: {
        id: currentUser._id,
        name: currentUser.name,
      },
      filters: {
        month: args.month ?? null,
        limit,
      },
      count: settlements.length,
      settlements,
    };
  },
});
