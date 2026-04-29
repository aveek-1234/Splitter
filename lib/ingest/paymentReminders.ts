import { ConvexHttpClient } from "convex/browser";
import { inngest } from "./client";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const paymentReminders = inngest.createFunction(
  {
    id: "payment-reminders",
  },
  {
    cron: "0 10 * * *",
  },
  async ({ step }) => {
    console.log("[paymentReminders] Starting payment reminders job");

    const users = await step.run("get-users-with-debts", async () => {
      console.log("[paymentReminders] Fetching users with debts");

      return await convex.query(api.inngest.getUsersWithDebts);
    });

    console.log(
      `[paymentReminders] Found ${users?.length || 0} users with debts`,
    );

    const results: { userId: string; success: boolean }[] = [];

    for (const user of users) {
      try {
        console.log(
          `[paymentReminders] Processing user: ${user.name} (${user.email})`,
        );

        const row = user.debts
          .map(
            (debt) => `
              <tr>
                <td style="padding:4px 8px;">
                  ${debt.name}
                </td>

                <td style="padding:4px 8px;">
                  ₹${debt.amount.toFixed(2)}
                </td>
              </tr>
            `,
          )
          .join("");

        if (!row) {
          console.log(
            `[paymentReminders] No debts found for ${user.name}, skipping`,
          );

          continue;
        }

        const htmlTemplate = `
          <div style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">
            <h1 style="color:#dc2626;">
              Payment Reminder
            </h1>

            <p>
              Hi ${user.name},
            </p>

            <p>
              You currently have the following outstanding balances:
            </p>

            <table
              cellspacing="0"
              cellpadding="0"
              border="1"
              style="border-collapse:collapse; width:100%;"
            >
              <thead>
                <tr>
                  <th style="padding:8px;">
                    To
                  </th>

                  <th style="padding:8px;">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody>
                ${row}
              </tbody>
            </table>

            <p style="margin-top:20px;">
              Please settle your pending balances soon.
            </p>

            <hr style="margin:30px 0;" />

            <p style="font-size:14px; color:#666;">
              Thank you for using Splitterr.
            </p>
          </div>
        `;

        await step.run(`send-email-${user._id}`, async () => {
          console.log(`[paymentReminders] Sending email to ${user.email}`);

          return await convex.action(api.sendEmail.sendEmail, {
            to: user.email,
            subject: "Pending Payment Reminder",
            html: htmlTemplate,
          });
        });

        console.log(
          `[paymentReminders] Email sent successfully to ${user.email}`,
        );

        results.push({
          userId: user._id,
          success: true,
        });

        // Proper Inngest rate limiting
        await step.sleep(`rate-limit-${user._id}`, "600ms");
      } catch (error) {
        console.error(`[paymentReminders] Failed for user ${user._id}`, error);

        results.push({
          userId: user._id,
          success: false,
        });
      }
    }

    const successCount = results.filter((result) => result.success).length;

    const failureCount = results.filter((result) => !result.success).length;

    console.log(
      `[paymentReminders] Completed. Processed: ${results.length}, Success: ${successCount}, Failures: ${failureCount}`,
    );

    return {
      processed: results.length,
      success: successCount,
      failure: failureCount,
    };
  },
);
