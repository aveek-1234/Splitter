import { api } from "./_generated/api";
import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * getGroupExpenses
 *
 * Returns all expenses and settlements associated with a given group.
 * Assumptions (based on existing schema used in `getIndividualExpenses`):
 * - `expenses` table has a `groupId` field (undefined/null for non‑group expenses).
 * - `settlements` table has a `groupId` field (undefined/null for non‑group settlements).
 */
export const getGroupExpenses = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, { groupId }) => {
    const currentUser= await ctx.runQuery(api.users.getCurrentUser)


    const group = await ctx.db.get(groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    // Check if currentUser is a member of this group
    if (!group.members || !Array.isArray(group.members) || !group.members.some((memberId: any) => memberId.toString() === currentUser._id.toString())) {
      throw new Error("You are not a member of this group.");
    }

    // All expenses that belong to this group
    // Use indexing for faster query
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();

    // All settlements that belong to this group
    const settlements = await ctx.db
      .query("settlements")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();

    const memberDetails = await Promise.all(
      (group.members || []).map(async (member) => {
        const user = await ctx.db.get(member.userId);
        if (user) {
          return {
            id: user._id,
            name: user.name,
            email: user.email,
            imageUrl: user.imageUrl,
          };
        }
        return null;
      })
    );

    const memberIds = (group.members || []).map(member => member.userId);
    
    const totalOutstandingBalancePerUser= Object.fromEntries(memberIds.map((id)=>[id,0]));

    const ledger: Record<string, Record<string, number>> = {};

    memberIds.forEach((id: string) => {
      (ledger as Record<string, any>)[id] = {};
      memberIds.forEach((otherIds:string)=>{
        if (id !== otherIds) {
          (ledger as Record<string, Record<string, number>>)[id][otherIds] = 0;
        }
      })
    });
    
    for(const expense of expenses)
    {
      const payer = expense.paidByUserId;
      for(const split of expense.splits){
        if(split.userId===payer || split.paid)
        {
          continue;
        }
        const userWhoNeedToPayThePayer= split.userId;
        const amount= split.amount;

        totalOutstandingBalancePerUser[payer]+=amount;
        totalOutstandingBalancePerUser[userWhoNeedToPayThePayer]-=amount;

        ledger[userWhoNeedToPayThePayer][payer]+=amount;
      }
    }

    for (const settlement of settlements)
    {
      totalOutstandingBalancePerUser[settlement.paidByUserId]+=settlement.amount;
      totalOutstandingBalancePerUser[settlement.receivedByUserId]-=settlement.amount;

      ledger[settlement.paidByUserId][settlement.receivedByUserId]-=settlement.amount
    }

    memberIds.forEach((id1)=>{
      memberIds.forEach((id2)=>{
        if(id1>id2)
          return 
        const difference = ledger[id1][id2]-ledger[id2][id1];
        if(difference>0)
        {
          ledger[id1][id2]=difference;
          ledger[id2][id1]=0
        }
        else if(difference<0){
          ledger[id1][id2]=0;
          ledger[id2][id1]=difference*(-1);
        }
        else{
          ledger[id1][id2]=ledger[id2][id1]=0;
        }
      })
    })
    const groupBalances = memberDetails.map(member => ({
      ...member,
      totalOutstandingBalance: member && member.id ? totalOutstandingBalancePerUser[member.id] ?? 0 : 0,
      userOwe: member && member.id ?Object.entries(ledger[member.id]).filter(([,v])=>v>0).map(([to,amount])=>({to,amount})):0,
      userOwedBy:member && member.id ? Object.entries(ledger[member.id]).filter(([,v])=>v<0).map(([from,amount])=>({from,amount})):0,
    }));
    
    const userLookup: Record<string, typeof memberDetails[number]> = {};

    memberDetails.forEach((member) => {
      if (typeof member?.id !== 'undefined') {
        userLookup[member.id] = member;
      }
    });
    
    return {
      groupDetails:{
        id:group._id,
        name:group.name,
        description: group.description
      },
      members:memberDetails,
      expenses,
      settlements,
      groupBalances,
      userLookup
    };
  },
});



type GroupDoc = Doc<"groups">;
type UserDoc = Doc<"users">;
type GroupMember = GroupDoc["members"][number];

type GroupMemberWithUser = {
  id: Id<"users">;
  name: string;
  email: string;
  imageUrl?: string;
  role: string;
  joinedAt: number;
  isCurrentUser: boolean;
};

type GroupWithMembers = {
  id: Id<"groups">;
  name: string;
  description?: string;
  members: GroupMemberWithUser[];
  otherMembers: GroupMemberWithUser[];
};

export const getUserGroupsWithMembers = query({
  args: {},
  handler: async (ctx): Promise<GroupWithMembers[]> => {
    const currentUser: UserDoc = await ctx.runQuery(api.users.getCurrentUser);

    const allGroups: GroupDoc[] = await ctx.db.query("groups").collect();

    const userGroups: GroupDoc[] = allGroups.filter((group) =>
      group.members.some((m: GroupMember) => m.userId === currentUser._id)
    );

    const groupsWithMembers: GroupWithMembers[] = await Promise.all(
      userGroups.map(async (group: GroupDoc): Promise<GroupWithMembers> => {
        const membersWithDetails: (GroupMemberWithUser | null)[] =
          await Promise.all(
            group.members.map(
              async (member: GroupMember): Promise<GroupMemberWithUser | null> => {
                const user = await ctx.db.get(member.userId);
                if (!user) return null;

                const typedUser = user as UserDoc;

                return {
                  id: typedUser._id,
                  name: typedUser.name,
                  email: typedUser.email,
                  imageUrl: typedUser.imageUrl,
                  role: member.role,
                  joinedAt: member.joinedAt,
                  isCurrentUser: typedUser._id === currentUser._id,
                };
              }
            )
          );

        const members: GroupMemberWithUser[] = membersWithDetails.filter(
          (m): m is GroupMemberWithUser => m !== null
        );
        const otherMembers: GroupMemberWithUser[] = members.filter(
          (m) => !m.isCurrentUser
        );

        return {
          id: group._id,
          name: group.name,
          description: group.description,
          members,
          otherMembers,
        };
      })
    );

    return groupsWithMembers;
  },
});

