import { ConvexHttpClient } from "convex/browser";
import { inngest } from "./client";
import { api } from "@/convex/_generated/api";
import OpenAI from "openai";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Groq Client
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: "https://api.groq.com/openai/v1",
});

export const spendingInsights = inngest.createFunction(
  {
    id: "spending-insights",
  },
  {
    cron: "0 10 * * *",
  },
  async ({ step }) => {
    const users = await step.run("Get Users With Expenses", async () => {
      return await convex.query(api.inngest.getUsersWithExpenses);
    });

    const expenditureDetailsOfEachUser: { userId: string; success: boolean }[] =
      [];

    for (const user of users) {
      const expenses = await step.run(`Expenses ${user._id}`, () =>
        convex.query(api.inngest.getUserMonthlyExpenses, {
          userId: user._id,
        }),
      );

      if (!expenses?.expenses?.length) {
        continue;
      }

      const totalSpent = expenses.expenses.reduce(
        (sum: number, exp: any) => sum + exp.amount,
        0,
      );

      const categories = expenses.expenses.reduce((category: any, exp: any) => {
        category[exp.category ?? "Uncategorised"] =
          (category[exp.category ?? "Uncategorised"] ?? 0) + exp.amount;

        return category;
      }, {});

      const expenseData = {
        totalSpent,
        totalTransactions: expenses.expenses.length,
        categories,
        expenses: expenses.expenses,
      };

      const prompt = `
You are an expert personal finance advisor.

Analyze the user's monthly spending data and generate a detailed financial report.

IMPORTANT:
- Return ONLY valid HTML
- No markdown
- No code blocks
- Use clean email-friendly HTML

DATA:
${JSON.stringify(expenseData)}

The report should include:
1. Financial Summary
2. Category Breakdown
3. Spending Insights
4. Savings Recommendations
5. Financial Health Score
6. Final Advice

Use:
<h2>, <h3>, <p>, <ul>, <li>, <table>

Make the report professional and personalized.
                      `;

      try {
        const aiResponse = await step.run(
          `AI Analysis ${user._id}`,
          async () => {
            return await groq.chat.completions.create({
              model: "llama-3.3-70b-versatile",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a financial advisor that returns clean HTML only.",
                },
                {
                  role: "user",
                  content: prompt,
                },
              ],
              temperature: 0.7,
            });
          },
        );

        const htmlResponse =
          aiResponse.choices?.[0]?.message?.content ??
          "<p>Unable to generate insights.</p>";

        await step.run(`Email ${user._id}`, () =>
          convex.action(api.sendEmail.sendEmail, {
            to: user.email,
            subject: "Your Monthly Financial Insights",
            html: `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h1 style="color:#2563eb;">
    Your Monthly Financial Insights
  </h1>

  <p>Hi ${user.name},</p>

  <p>
    Here's your personalized spending analysis for the past month.
  </p>

  ${htmlResponse}

  <hr style="margin:30px 0;" />

  <p style="font-size:14px;color:#666;">
    Keep tracking your expenses to build smarter financial habits.
  </p>
</div>
              `,
          }),
        );

        expenditureDetailsOfEachUser.push({
          userId: user._id,
          success: true,
        });

        // Optional rate-limit protection
        await step.sleep(`rate-limit-${user._id}`, "3s");
      } catch (error) {
        console.error(`AI Analysis Failed for ${user._id}`, error);

        expenditureDetailsOfEachUser.push({
          userId: user._id,
          success: false,
        });
      }
    }

    return {
      processed: expenditureDetailsOfEachUser.length,
      success: expenditureDetailsOfEachUser.filter((result) => result.success)
        .length,
      failed: expenditureDetailsOfEachUser.filter((result) => !result.success)
        .length,
    };
  },
);
