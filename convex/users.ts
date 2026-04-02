import { v } from "convex/values";
import { mutation, query} from "./_generated/server"
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const store = mutation({
    args:{},
    handler: async (ctx) => {
        // Implementation here
        const identity = await ctx.auth.getUserIdentity();
        if(!identity) {
            throw new Error("User not authenticated");
        }
        const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) =>
            q.eq("tokenId" , identity.tokenIdentifier)
        ).unique();
        if(user!== null)
        {
            if(user.name !== identity.name)
            {
                await ctx.db.patch(user._id, {name: identity.name});
            }
            return user._id
        }
        return await ctx.db.insert("users", {
            name: identity.name??"Anonymous",
            email: identity.email?? "",
            imageUrl: identity.pictureUrl,
            tokenId: identity.tokenIdentifier
        });
    }
})

export const getCurrentUser = query({
    handler: async(ctx)=>{
        const identity = await ctx.auth.getUserIdentity();
        if(!identity){ 
            throw new Error("User not Authenticated");
        }
        const user = await ctx.db
                    .query("users")
                    .withIndex("by_token", (q)=>q.eq("tokenId", identity.tokenIdentifier))
                    .first()

        if(!user){
            throw new Error("User not found");
        }
        return user;
    },
});

export const getUserById = query({
    args:{id: v.string()},
    handler: async(ctx, args)=>{
        const user = await ctx.db.get(args.id as Id<"users"> );
        if(!user){
            throw new Error("User not found");
        }
        return user;
    }
});


export const searchUsers = query({
    args:{query: v.string()},
    handler: async(ctx, args)=>{
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("User not authenticated");
    }
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenId", identity.tokenIdentifier)
      )
      .first();
    if(args.query.length === 0) {
        return [];
    }
    const nameResults = await ctx.db.query("users")
        .withSearchIndex("search_name", (q) => q.search("name", args.query))
        .collect();
        
    const emailResults = await ctx.db.query("users")
        .withSearchIndex("search_email", (q) => q.search("email", args.query))
        .collect();
    
    const users = [
        ...nameResults,
        ...emailResults.filter((emailResult) => !nameResults.some((nameResult) => nameResult._id === emailResult._id))
    ]

    return users
        .filter((user) => user._id !== currentUser?._id)
        .map((user) => ({ _id: user._id, name: user.name, email: user.email, imageUrl: user.imageUrl }));
  }
});