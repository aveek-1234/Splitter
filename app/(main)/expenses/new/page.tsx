"use client"
import React, { use } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ExpenseForm from "./components/ExpenseForm"
import router from "next/router"
import { useRouter, useSearchParams } from "next/navigation"

const CreatNewExpensePage = () => {
    const router=  useRouter();
    const queryParams= useSearchParams();
    const type = queryParams.get("type") || "";
    const id= queryParams.get("id") || "";
    const isTabListVisible= type && id;
  return (
    <div className="space-y-4">
      {/* Heading section */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Create new expense
        </h1>
        <p className="text-sm text-muted-foreground">
          Add a new expense and choose how you want to split it.
        </p>
      </div>

      {/* Card with tabs */}
      <Card>
        <CardContent>
          <Tabs defaultValue={type || "individual"} className="w-full">
            {!isTabListVisible && (
              <TabsList>
                <TabsTrigger value="individual">Individual expense</TabsTrigger>
                <TabsTrigger value="group">Group expense</TabsTrigger>
              </TabsList>
            )}

            <TabsContent value="individual" className="mt-4">
              <ExpenseForm
                type="individual"
                id={id}
                onSuccess={(id:string)=>{router.push(`/users/${id}`)}}
               />
            </TabsContent>

            <TabsContent value="group" className="mt-4">
             <ExpenseForm
             type="group"
             id={id}
             onSuccess={(id:string)=>{router.push(`/group/${id}`)}}
             />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default CreatNewExpensePage;
