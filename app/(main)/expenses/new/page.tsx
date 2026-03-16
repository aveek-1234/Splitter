"use client"
import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ExpenseForm from "./components/ExpenseForm"
import router from "next/router"
import { useRouter } from "next/navigation"

const CreatNewExpensePage = () => {
    const router=  useRouter();
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
          <Tabs defaultValue="individual">
            <TabsList>
              <TabsTrigger value="individual">Individual expense</TabsTrigger>
              <TabsTrigger value="group">Group expense</TabsTrigger>
            </TabsList>

            <TabsContent value="individual" className="mt-4">
              <ExpenseForm
                type="individual"
                onSuccess={(id:string)=>{router.push(`/person/${id}`)}}
               />
            </TabsContent>

            <TabsContent value="group" className="mt-4">
             <ExpenseForm
             type="group"
             onSuccess={(id:string)=>{router.push(`/groups/${id}`)}}
             />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default CreatNewExpensePage;
