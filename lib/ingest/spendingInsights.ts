import { ConvexHttpClient } from "convex/browser";
import { inngest } from "./client";
import { api } from "@/convex/_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";

const convex= new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({model:"gemini-1.5-flash"})

export const spendingInsights = inngest.createFunction(
  { id: "spending-insights" },
  {cron:"0 10 * * *"},
  async({step})=>{
    const users = await step.run("Get Users With Expenses", async()=>{
      return await convex.query(api.inngest.getUsersWithExpenses)
    });

    const expenditureDetailsOfEachUser= [];

    for(const user of users)
    {
      const expenses = await step.run(`Epenses ${user._id}`,()=>
        convex.query(api.inngest.getUserMonthlyExpenses,{userId: user._id})
      );
      if(!expenses?.expenses.length)
      {
        continue;
      }

      const expenseData = JSON.stringify({
        expenses,
        totalSpent: expenses.expenses.reduce((sum: any,exp: any)=> sum+exp.amount, 0),
        categories: expenses.expenses.reduce((category:any, exp:any)=>{
            category[exp.category??"Uncategorised"]=(
              category[exp.category??"Uncategorised"] ??0
            )+ exp.amount;
            return category;
        },{})
      })

      const prompt =`Please analyze the data and return in HTML format ${expenseData}`

      try {
        const aiResPonse = await step.ai.wrap(
          "gemini",
          async (p)=>model.generateContent(p),
          prompt
        )
        const part = aiResPonse?.response?.candidates?.[0]?.content?.parts?.[0];
        const htmlResponse = part && "text" in part ? part.text : "";

        await step.run(
          `Email ${user._id}`,
          ()=>convex.action(
            api.sendEmail.sendEmail,{
              to:user.email,
              subject: "Analysis for expenditure",
              html:`
              <h1>Your Monthly Financial Insights</h1>
              <p>Hi ${user.name},</p>
              <p>Here's your personalized spending analysis for the past month:</p>
              ${htmlResponse}
              `,
              apiKey:process.env.GEMINI_API_KEY
            }
          )
        )
        expenditureDetailsOfEachUser.push({
          userId: user._id,
          success:true
        })
      } catch (error) {
        expenditureDetailsOfEachUser.push({
          userId: user._id,
          success:false
        })
      }
    }
    return {
      processed: expenditureDetailsOfEachUser.length,
      success : expenditureDetailsOfEachUser.filter(result=>result.success).length,
      failed: expenditureDetailsOfEachUser.filter((result)=>!result.success).length
    }
  })