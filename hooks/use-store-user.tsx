import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
// import { store } from "@/convex/users";
import { useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useState } from "react";

export function useStoreUser()
{
    const {isLoading,isAuthenticated} = useConvexAuth();
    const {user}= useUser()
    const [userId, setUserId]= useState<Id<"users">|null>(null)
    const storeUser= useMutation(api.users.store)

    useEffect(()=>{
        if(!isAuthenticated){
            return 
        }
        async function storeUserInDatabase() {
            const id = await storeUser();
            setUserId(id);
        }
        storeUserInDatabase();
        return ()=>setUserId(null);
    },[isAuthenticated,user?.id])
    
    return {
        isLoading: isLoading || (isAuthenticated && userId === null),
        isAuthenticated: isAuthenticated && userId !==null
    };
}