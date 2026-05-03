// convex/export.ts
"use node";

import { v } from "convex/values";
import { action, mutation } from "./_generated/server";
import { api } from "./_generated/api";
import { inngest } from "../lib/ingest/client";

export const triggerExport = action({
  args: {
    transactions: v.array(v.any()),
  },

  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.getCurrentUser);
    if (!user) {
      throw new Error("User not found");
    }
    const result = await inngest.send({
      name: "transactions/export",
      data: {
        email: user.email,
        transactions: args.transactions,
      },
    });
    console.log("Inngest result:", result);
    return {
      success: true,
    };
  },
});
