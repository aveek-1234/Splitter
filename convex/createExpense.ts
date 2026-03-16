import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { api } from "./_generated/api";

export const createExpense: ReturnType<typeof mutation> = mutation({
    args:{
    description: v.string(),
    amount: v.number(),
    category: v.optional(v.string()),
    date: v.number(), // timestamp
    paidByUserId: v.id("users"),
    splitType: v.string(), // "equal", "percentage", "exact"
    splits: v.array(
      v.object({
        userId: v.id("users"),
        amount: v.number(),
        paid: v.boolean(),
      })
    ),
    groupId: v.optional(v.id("groups")),
    },
    handler:async(ctx, args)=>{
        const user = await ctx.runQuery(api.users.getCurrentUser);

        if(args.groupId)
        {
          const group = await ctx.db.get(args.groupId)
          if(!group)
          {
            throw new Error("Group not Found");
          }
          const isMember = group.members.some((member)=>member.userId=== user._id);
          if(!isMember)
          {
            throw new Error("You are not a member")
          }
        }

        const totalSplitAmount = args.splits.reduce(
          (amount, split) => amount + split.amount,
          0
        );

        const tolerance = 0.01;

        if (Math.abs(totalSplitAmount - args.amount) > tolerance) {
          throw new Error("Splits Must add up to total amount");
        }

        const expenseId = await ctx.db.insert("expenses", {
          description: args.description,
          amount: args.amount,
          category: args.category,
          date: args.date,
          paidByUserId: args.paidByUserId,
          splitType: args.splitType,
          splits: args.splits,
          groupId: args.groupId,
          createdBy: user._id,
        });

        return expenseId;
    },
  })
