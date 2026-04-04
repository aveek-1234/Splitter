import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { Split } from "../lib/models";
import { Id } from "./_generated/dataModel";
import type { User } from "../lib/models";

export const createSettlement: ReturnType<typeof mutation> = mutation({
  args: {
    amount: v.number(),
    note: v.optional(v.string()),
    paidByUserId: v.id("users"),
    receivedByUserId: v.id("users"),
    groupId: v.optional(v.id("groups")),
  },
  handler: async (ctx, args) => {
    const user: User = await ctx.runQuery(api.users.getCurrentUser);

    // Basic validations
    if (args.amount <= 0) {
      throw new Error("Amount must be greater than zero");
    }
    if (args.paidByUserId === args.receivedByUserId) {
      throw new Error("Payer and receiver cannot be the same user");
    }

    // If groupId is provided, make sure group exists and user is a member
    if (args.groupId) {
      const group = await ctx.db.get(args.groupId);
      if (!group) {
        throw new Error("Group not found");
      }
      const isMember = group.members.some(
        (m: any) => m.userId === user._id
      );
      if (!isMember) {
        throw new Error("You are not a member of this group from createSettlement.");
      }

      // also make sure both parties belong to the group
      const paidByMember = group.members.some(
        (m: any) => m.userId === args.paidByUserId
      );
      const receivedByMember = group.members.some(
        (m: any) => m.userId === args.receivedByUserId
      );
      if (!paidByMember || !receivedByMember) {
        throw new Error("Both users must belong to the group");
      }
    }

    const settlementId = await ctx.db.insert("settlements", {
      amount: args.amount,
      note: args.note,
      date: Date.now(),
      paidByUserId: args.paidByUserId,
      receivedByUserId: args.receivedByUserId,
      groupId: args.groupId,
      createdBy: user._id as Id<"users">,
    });

    return settlementId;
  },
});


export type GetSettlementsResult =
  | {
      type: "user";
      group: null;
      otheruserDetails: {
        _id: Id<"users">;
        name: string;
        email: string;
        imageUrl: string | null;
      };
      balanceDetails: Array<{
        userId: Id<"users">;
        name: string;
        imageUrl: string | null;
        userOwe: number;
        userIsOwed: number;
        netBalance: number;
      }>;
    }
  | {
      type: "group";
      group: {
        id: Id<"groups">;
        name: string;
        description: string;
      };
      otheruserDetails: null;
      balanceDetails: Array<{
        userId: Id<"users">;
        name: string;
        imageUrl: string | null;
        userOwe: number;
        userIsOwed: number;
        netBalance: number;
      }>;
    };

export const getSettlements = query({
  args: {
    type: v.string(),
    id: v.union(v.id("users"), v.id("groups"))
  },
  handler: async (ctx, args): Promise<GetSettlementsResult> => {
    const currentUser: User = await ctx.runQuery(api.users.getCurrentUser);
    if(args.type === "user"){
      const userId = args.id as Id<"users">;
      const otherUser= await ctx.db.get(userId);
      if(!otherUser){
        throw new Error("User not found");
      }
      const currentUserExpeses= await ctx.db.query("expenses").withIndex("by_user_and_group", q => q.eq("paidByUserId", currentUser._id as Id<"users">).eq("groupId",undefined)).collect();
      const otherUserExpeses= await ctx.db.query("expenses").withIndex("by_user_and_group", q => q.eq("paidByUserId", userId).eq("groupId",undefined)).collect();
      const expenses = [...currentUserExpeses, ...otherUserExpeses];

      let owedByCurrentUser = 0;
      let owedToCurrentUser = 0;
      for(const expense of expenses){
        const isCurrentUserInvolved= expense.paidByUserId === currentUser._id || expense.splits.some((p: Split) => p.userId === currentUser._id);
        const isOtherUserInvolved= expense.paidByUserId === otherUser._id || expense.splits.some((p: Split) => p.userId === otherUser._id);
        if(!isCurrentUserInvolved || !isOtherUserInvolved){
          continue;
        }
        if(expense.paidByUserId === currentUser._id){
          const splitForOtherUser= expense.splits.find((p: Split) => p.userId === otherUser._id && !p.paid );
          if(splitForOtherUser){
            owedToCurrentUser += splitForOtherUser.amount;
          }
        }
        if(expense.paidByUserId === otherUser._id){
          const splitForCurrentUser= expense.splits.find((p: Split) => p.userId === currentUser._id && !p.paid );
          if(splitForCurrentUser){
            owedByCurrentUser += splitForCurrentUser.amount;
          }
        }
      }
      const currentUserSettlements= await ctx.db.query("settlements").withIndex("by_user_and_group", q => q.eq("paidByUserId", currentUser._id as Id<"users">).eq("groupId",undefined)).collect();
      const otherUserSettlements= await ctx.db.query("settlements").withIndex("by_user_and_group", q => q.eq("paidByUserId", userId).eq("groupId",undefined)).collect();
      const settlements = [...currentUserSettlements, ...otherUserSettlements];
      for(const settlement of settlements){
        if(settlement.paidByUserId===currentUser._id){
          if(settlement.receivedByUserId === otherUser._id){
            owedToCurrentUser -= settlement.amount;
          }
        }
        if(settlement.paidByUserId===otherUser._id){
          if(settlement.receivedByUserId === currentUser._id){
            owedByCurrentUser -= settlement.amount;
          }
        }
      }
      return {
        type: "user",
        group: null,
        otheruserDetails: {
          _id: otherUser._id,
          name: otherUser.name,
          email: otherUser.email,
          imageUrl: otherUser.imageUrl ?? null,
        },
        balanceDetails: [
          {
            userId: currentUser._id as Id<"users">,
            name: currentUser.name,
            imageUrl: currentUser.imageUrl ?? null,
            userOwe: owedByCurrentUser,
            userIsOwed: owedToCurrentUser,
            netBalance: owedToCurrentUser - owedByCurrentUser,
          },
          {
            userId: otherUser._id,
            name: otherUser.name,
            imageUrl: otherUser.imageUrl ?? null,
            userOwe: owedToCurrentUser,
            userIsOwed: owedByCurrentUser,
            netBalance: owedByCurrentUser - owedToCurrentUser,
          },
        ],
      };
    }
    else if(args.type === "group"){
      const groupId = args.id as Id<"groups">;
      const group = await ctx.db.get(groupId);
      if(!group){
        throw new Error("Group not found");
      }
      const isCurrentUserMember = group.members.some((m: any) => m.userId === currentUser._id);
      if(!isCurrentUserMember){
        throw new Error("You are not a member of this group from getSettlements.");
      }

      const expenses = await ctx.db.query("expenses").withIndex("by_group", q => q.eq("groupId", groupId)).collect();
      const balanceMap: Record<string, { userOwe: number; userIsOwed: number }> = {};
      for(const member of group.members){
        balanceMap[member.userId] = { userOwe: 0, userIsOwed: 0 };
      }

      for(const expense of expenses){
        const payerId = expense.paidByUserId;
        for(const split of expense.splits){
          if(split.paid || split.userId === payerId) continue;

          // The split user owes the payer
          balanceMap[split.userId].userOwe += split.amount;
          balanceMap[payerId].userIsOwed += split.amount;
        }
      }

      const settlements = await ctx.db.query("settlements").withIndex("by_group", q => q.eq("groupId", groupId)).collect();
      for(const settlement of settlements){
        const payerId = settlement.paidByUserId;
        const receiverId = settlement.receivedByUserId;

        balanceMap[payerId].userOwe -= settlement.amount;
        balanceMap[receiverId].userIsOwed -= settlement.amount;
      }

      const members = await Promise.all(
        group.members.map(async (m: any) => {
          const user = await ctx.db.get(m.userId as Id<"users">);
          const name = user?.name || "Unknown";
          const imageUrl = user?.imageUrl || null;
          return {
            userId: m.userId,
            name,
            imageUrl,
          };
        })
      );

      const balanceDetails = members.map((member) => {
        const bal = balanceMap[member.userId] ?? { userOwe: 0, userIsOwed: 0 };
        return {
          userId: member.userId,
          name: member.name,
          imageUrl: member.imageUrl,
          userOwe: bal.userOwe,
          userIsOwed: bal.userIsOwed,
          netBalance: bal.userIsOwed - bal.userOwe,
        };
      });

      return {
        type: "group",
        group: {
          id: group._id,
          name: group.name,
          description: group.description ?? "",
        },
        otheruserDetails: null,
        balanceDetails,
      };
    }

    throw new Error("Invalid type");
  }
})