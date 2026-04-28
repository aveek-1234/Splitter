import { ConvexHttpClient } from "convex/browser";
import { inngest } from "./client";
import { api } from "@/convex/_generated/api";

const convex= new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL)


export const paymentReminders = inngest.createFunction(
  { id: "payment-reminders" },
  {cron:"0 10 * * *",
    throttle:{
      limit:2,
      period:"1s"
    },
  },
  async({step})=>{
    const users = await step.run("get-debts",()=>convex.query(api.inngest.getUsersWithDebts))

    console.log("Users with debts:", users);

    // const results= await step.run("send-emails",()=>{
    //   return Promise.all(
    //     users.map(
    //       async(user)=>{
    //         const row= user.debts.map((debt)=>
    //         `
    //            <tr>
    //               <td style="padding:4px 8px;">${debt.name}</td>
    //               <td style="padding:4px 8px;">₹${debt.amount.toFixed(2)}</td>
    //             </tr>
    //         `
    //         )
    //         .join("");
    //        if(!row) return {userId:user._id, skipped:true};

    //        const desiredtemplate=
    //        `
    //         <h2>Splitterr – Payment Reminder</h2>
    //         <p>Hi ${user.name}, you have the following outstanding balances:</p>
    //         <table cellspacing="0" cellpadding="0" border="1" style="border-collapse:collapse;">
    //           <thead>
    //             <tr><th>To</th><th>Amount</th></tr>
    //           </thead>
    //           <tbody>${row}</tbody>
    //         </table>
    //         <p>Please settle up soon. Thanks!</p>
    //        `
    //        try {
    //          await convex.action(api.sendEmail.sendEmail,{
    //           to:user.email,
    //           subject:"Hi There Please clear Your Pending payments",
    //           html:desiredtemplate,
    //          })
    //          return {success:true}
    //        } catch (error) {
    //         return {success:false}
    //        }
    //   }))
    // })

    const results = [];

for (const user of users) {
  const result = await step.run(`send-email-${user._id}`, async () => {
    const rows = user.debts
      .map(
        (debt) => `
        <tr>
          <td style="padding:4px 8px;">${debt.name}</td>
          <td style="padding:4px 8px;">₹${debt.amount.toFixed(2)}</td>
        </tr>
      `
      )
      .join("");

    if (!rows) return { userId: user._id, skipped: true };

    const template = `
      <h2>Splitterr – Payment Reminder</h2>
      <p>Hi ${user.name}, you have the following outstanding balances:</p>
      <table border="1" style="border-collapse:collapse;">
        <thead>
          <tr><th>To</th><th>Amount</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p>Please settle up soon. Thanks!</p>
    `;

    const res = await convex.action(api.sendEmail.sendEmail, {
      to: user.email,
      subject: "Please clear your pending payments",
      html: template,
    });

    return res;
  });

  results.push(result);

  // 👇 CRITICAL: prevent rate limit
  await step.sleep(`rate-limit-${user._id}`, "600ms");
}

    return {
      processed: results.length,
      success:results.filter((result)=>"success" in result && result.success===true).length,
      failure:results.filter((result)=>"success" in result && result.success===false).length
    }
  }
)