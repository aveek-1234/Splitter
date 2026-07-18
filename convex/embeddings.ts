import { query } from "./_generated/server";

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

    const documents: Array<{
      sourceTable: "users" | "groups" | "expenses" | "settlements";
      sourceId: string;
      entityType: string;
      entityId: string;
      text: string;
      createdAt: number;
    }> = [];

    for (const user of users) {
      documents.push({
        sourceTable: "users",
        sourceId: user._id,
        entityType: "users",
        entityId: user._id,
        text: [user.name, user.email].filter(Boolean).join(" "),
        createdAt: user._creationTime,
      });
    }

    for (const group of groups) {
      documents.push({
        sourceTable: "groups",
        sourceId: group._id,
        entityType: "groups",
        entityId: group._id,
        text: [group.name, group.description ?? ""].filter(Boolean).join(" "),
        createdAt: group._creationTime,
      });
    }

    for (const expense of expenses) {
      const paidByUser = userById.get(expense.paidByUserId);
      const group = expense.groupId ? groupById.get(expense.groupId) : undefined;
      const splitterText = expense.splits
        .map((split) => {
          const splitUser = userById.get(split.userId);
          return `${splitUser?.name ?? "Unknown user"}:${split.amount}`;
        })
        .join(" ");

      documents.push({
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
      });
    }

    for (const settlement of settlements) {
      const paidByUser = userById.get(settlement.paidByUserId);
      const receivedByUser = userById.get(settlement.receivedByUserId);
      const group = settlement.groupId ? groupById.get(settlement.groupId) : undefined;

      documents.push({
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
      });
    }

    return documents;
  },
});
