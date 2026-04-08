import { Id } from './_generated/dataModel.js';
import {api, internal} from './_generated/api.js'
import { mutation, query } from "./_generated/server";
import { v } from 'convex/values';

export interface contactUserModel{
    id: Id<"users">,
    name: string,
    email: string,
    type: string,
    image?: string,
}

export interface contactGroupModel{
    id: Id<"groups">,
    name: string,
    description?: string,
    type: string,
    memberCount: number,
}


export const getAllContacts = query({
    handler: async (ctx) => {
        const currentUser = await ctx.runQuery(api.users.getCurrentUser);

        const expensesYouPaid= await ctx.db.query('expenses').withIndex("by_user_and_group",(q)=>q.eq("paidByUserId", currentUser._id).eq("groupId", null)).collect();
        const expensesNotPaidByYou= (await ctx.db
                                            .query('expenses')
                                            .withIndex("by_group",(q)=>q.eq("groupId", null))
                                            .collect()).filter((expense) => expense.paidByUserId !== currentUser._id && expense.splits.some((split) => split.userId === currentUser._id));
        const personalExpenses= [...expensesYouPaid, ...expensesNotPaidByYou];
        const contIds= new Set();
        personalExpenses.forEach((expenses)=>{
            if(expenses.paidByUserId !== currentUser._id){
                contIds.add(expenses.paidByUserId);
            }
            expenses.splits.forEach((split) => {
                if(split.userId !== currentUser._id){
                    contIds.add(split.userId);
                }
            });
        })
        const results = await Promise.all(
            [...contIds].flatMap(async (id) => {
            const user = await ctx.db.get(id as Id<"users">);
             return user
            ? [{
                id: user._id,
                name: user.name,
                email: user.email,
                image: user.imageUrl,
                type: "user",
            }]
        : [];
        }));
        const contactUsers: contactUserModel[] = results.flat();
        const userGroups:contactGroupModel[] =(await ctx.db.query("groups").collect()).filter((group)=>
            group.members.some((member) => member.userId === currentUser._id)
        ).map((group)=>({
            id:group._id,
            name: group.name,
            description:group.description,
            memberCount: group.members.length,
            type:"group"
        }));
        console.log("Contact Users:", contactUsers);
        console.log("User Groups:", userGroups);
        return [...contactUsers, ...userGroups];
    },
});

export const createGroup= mutation({
    args:{
        name: v.string(),
        description: v.optional(v.string()),
        members:v.array(v.id("users")),
    },
    handler: async (ctx, args) => {
        const currentUser= await ctx.runQuery(api.users.getCurrentUser);

        if(!args.name.trim()){
            throw new Error("Group name cannot be empty");
        }
        const uniqueMembers = new Set(args.members);
        uniqueMembers.add(currentUser._id);

        for(const id of uniqueMembers){
            const user = await ctx.db.get(id);
            if(!user){
                throw new Error("Invalid user ID");
            }
        }

        const group: Id<"groups"> = await ctx.db.insert("groups", {
            name: args.name,
            description: args.description,
            createdBy:currentUser._id,
            members: [...uniqueMembers].map((id) => ({ userId: id, role: id===currentUser._id ? "admin" : "member", joinedAt: Date.now() })),
        });

        return group;
    }
})