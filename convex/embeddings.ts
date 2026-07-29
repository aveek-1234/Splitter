import { v } from "convex/values";
import { query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export type EmbeddableDocument = {
  sourceTable: "users" | "groups" | "expenses" | "settlements";
  sourceId: string;
  entityType: string;
  entityId: string;
  text: string;
  createdAt: number;
};

type UserMap = Map<Id<"users">, Doc<"users">>;
type GroupMap = Map<Id<"groups">, Doc<"groups">>;

function buildUserDocument(user: Doc<"users">): EmbeddableDocument {
  return {
    sourceTable: "users",
    sourceId: user._id,
    entityType: "users",
    entityId: user._id,
    text: [user.name, user.email].filter(Boolean).join(" "),
    createdAt: user._creationTime,
  };
}

function buildGroupDocument(group: Doc<"groups">): EmbeddableDocument {
  return {
    sourceTable: "groups",
    sourceId: group._id,
    entityType: "groups",
    entityId: group._id,
    text: [group.name, group.description ?? ""].filter(Boolean).join(" "),
    createdAt: group._creationTime,
  };
}

function buildExpenseDocument(
  expense: Doc<"expenses">,
  userById: UserMap,
  groupById: GroupMap,
): EmbeddableDocument {
  const paidByUser = userById.get(expense.paidByUserId);
  const group = expense.groupId ? groupById.get(expense.groupId) : undefined;
  const splitterText = expense.splits
    .map((split) => {
      const splitUser = userById.get(split.userId);
      return `${splitUser?.name ?? "Unknown user"}:${split.amount}`;
    })
    .join(" ");

  return {
    sourceTable: "expenses",
    sourceId: expense._id,
    entityType: "expenses",
    entityId: expense._id,
    text: [
      expense.description,
      expense.category ?? "",
      `amount:${expense.amount}`,
      `paidBy:${paidByUser?.name ?? "Unknown user"}`,
      `group:${group?.name ?? "private"}`,
      splitterText,
    ]
      .filter(Boolean)
      .join(" "),
    createdAt: expense._creationTime,
  };
}

function buildSettlementDocument(
  settlement: Doc<"settlements">,
  userById: UserMap,
  groupById: GroupMap,
): EmbeddableDocument {
  const paidByUser = userById.get(settlement.paidByUserId);
  const receivedByUser = userById.get(settlement.receivedByUserId);
  const group = settlement.groupId
    ? groupById.get(settlement.groupId)
    : undefined;

  return {
    sourceTable: "settlements",
    sourceId: settlement._id,
    entityType: "settlements",
    entityId: settlement._id,
    text: [
      settlement.note ?? "",
      `amount:${settlement.amount}`,
      `paidBy:${paidByUser?.name ?? "Unknown user"}`,
      `receivedBy:${receivedByUser?.name ?? "Unknown user"}`,
      `group:${group?.name ?? "private"}`,
    ]
      .filter(Boolean)
      .join(" "),
    createdAt: settlement._creationTime,
  };
}

export const getEmbeddableDocument = query({
  args: {
    sourceTable: v.union(v.literal("expenses"), v.literal("settlements")),
    sourceId: v.string(),
  },
  handler: async (ctx, { sourceTable, sourceId }) => {
    const [users, groups] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("groups").collect(),
    ]);

    const userById = new Map(users.map((user) => [user._id, user]));
    const groupById = new Map(groups.map((group) => [group._id, group]));

    if (sourceTable === "expenses") {
      const expense = await ctx.db.get(sourceId as Id<"expenses">);
      if (!expense) {
        return null;
      }

      return buildExpenseDocument(expense, userById, groupById);
    }

    const settlement = await ctx.db.get(sourceId as Id<"settlements">);
    if (!settlement) {
      return null;
    }

    return buildSettlementDocument(settlement, userById, groupById);
  },
});

export const getAllEmbeddableDocuments = query({
  args: {},
  handler: async (ctx) => {
    const [users, groups, expenses, settlements] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("groups").collect(),
      ctx.db.query("expenses").collect(),
      ctx.db.query("settlements").collect(),
    ]);

    const userById = new Map(users.map((user) => [user._id, user]));
    const groupById = new Map(groups.map((group) => [group._id, group]));

    const documents: EmbeddableDocument[] = [];

    for (const user of users) {
      documents.push(buildUserDocument(user));
    }

    for (const group of groups) {
      documents.push(buildGroupDocument(group));
    }

    for (const expense of expenses) {
      documents.push(buildExpenseDocument(expense, userById, groupById));
    }

    for (const settlement of settlements) {
      documents.push(buildSettlementDocument(settlement, userById, groupById));
    }

    return documents;
  },
});
