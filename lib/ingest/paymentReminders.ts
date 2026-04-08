import { ConvexHttpClient } from "convex/browser";
import { inngest } from "./client";
import { api } from "@/convex/_generated/api";

const convex= new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL)


export const paymentReminders = inngest.createFunction(
  { id: "payment-reminders" },
  {cron:"0 10 * * *"},
  async({step})=>{
    const users = await step.run("get-debts",()=>convex.query(api.inngest.getUsersWithDebts))

    const results= await step.run("send-emails",()=>{
      return Promise.all(
        users.map(
          async(user)=>{
            const row= user.debts.map((debt)=>
            `
               <tr>
                  <td style="padding:4px 8px;">${debt.name}</td>
                  <td style="padding:4px 8px;">₹${debt.amount.toFixed(2)}</td>
                </tr>
            `
            )
            .join("");
           if(!row) return {userId:user._id, skipped:true};

           const desiredtemplate=
           `
            <h2>Splitterr – Payment Reminder</h2>
            <p>Hi ${user.name}, you have the following outstanding balances:</p>
            <table cellspacing="0" cellpadding="0" border="1" style="border-collapse:collapse;">
              <thead>
                <tr><th>To</th><th>Amount</th></tr>
              </thead>
              <tbody>${row}</tbody>
            </table>
            <p>Please settle up soon. Thanks!</p>
           `
           try {
             await convex.action(api.sendEmail.sendEmail,{
              to:user.email,
              subject:"Hi There Please clear Your Pending payments",
              html:desiredtemplate,
              apiKey:process.env.RESEND_API_KEY
             })
             return {success:true}
           } catch (error) {
            return {success:false}
           }
      }))
    })

    return {
      processed: results.length,
      success:results.filter((result)=>"success" in result && result.success===true).length,
      failure:results.filter((result)=>"success" in result && result.success===false).length
    }
  }
)