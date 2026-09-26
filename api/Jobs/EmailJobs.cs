using Splitter.Api.Ai;
using Splitter.Api.Convex;
using System.Text;
using System.Text.Json;

namespace Splitter.Api.Jobs;

public sealed class EmailJobs
{
    private readonly IConvexClient _convex;
    private readonly GroqClient _groq;
    private readonly ILogger<EmailJobs> _logger;

    public EmailJobs(IConvexClient convex, GroqClient groq, ILogger<EmailJobs> logger)
    {
        _convex = convex;
        _groq = groq;
        _logger = logger;
    }

    public async Task SendPaymentRemindersAsync()
    {
        var users = await _convex.QueryAsAdminAsync("inngest:getUsersWithDebts", new { });
        if (users.ValueKind != JsonValueKind.Array)
        {
            return;
        }

        foreach (var user in users.EnumerateArray())
        {
            try
            {
                if (!user.TryGetProperty("debts", out var debts) || debts.GetArrayLength() == 0)
                {
                    continue;
                }

                var rows = new StringBuilder();
                foreach (var debt in debts.EnumerateArray())
                {
                    var name = debt.TryGetProperty("name", out var n) ? n.GetString() : "Unknown";
                    var amount = debt.TryGetProperty("amount", out var a) ? a.GetDouble() : 0;
                    rows.Append($"<tr><td style=\"padding:4px 8px;\">{name}</td><td style=\"padding:4px 8px;\">₹{amount:F2}</td></tr>");
                }

                var html = $"""
                    <div style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">
                      <h1 style="color:#dc2626;">Payment Reminder</h1>
                      <p>Hi {user.GetProperty("name").GetString()},</p>
                      <p>You currently have the following outstanding balances:</p>
                      <table cellspacing="0" cellpadding="0" border="1" style="border-collapse:collapse; width:100%;">
                        <thead><tr><th style="padding:8px;">To</th><th style="padding:8px;">Amount</th></tr></thead>
                        <tbody>{rows}</tbody>
                      </table>
                      <p style="margin-top:20px;">Please settle your pending balances soon.</p>
                    </div>
                    """;

                await _convex.ActionAsAdminAsync("sendEmail:sendEmail", new
                {
                    to = user.GetProperty("email").GetString(),
                    subject = "Pending Payment Reminder",
                    html,
                });
                await Task.Delay(600);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Payment reminder failed for a user");
            }
        }
    }

    public async Task SendSpendingInsightsAsync()
    {
        var users = await _convex.QueryAsAdminAsync("inngest:getUsersWithExpenses", new { });
        if (users.ValueKind != JsonValueKind.Array)
        {
            return;
        }

        foreach (var user in users.EnumerateArray())
        {
            try
            {
                var userId = user.GetProperty("_id").GetString();
                var expenses = await _convex.QueryAsAdminAsync("inngest:getUserMonthlyExpenses", new { userId });
                if (!expenses.TryGetProperty("expenses", out var expenseList) || expenseList.GetArrayLength() == 0)
                {
                    continue;
                }

                var prompt = $"""
                    You are an expert personal finance advisor.
                    Analyze the user's monthly spending data and generate a detailed financial report.
                    IMPORTANT: Return ONLY valid HTML. No markdown. No code blocks.
                    DATA:
                    {expenses}
                    The report should include Financial Summary, Category Breakdown, Spending Insights, Savings Recommendations, Financial Health Score, and Final Advice.
                    """;

                var htmlResponse = await _groq.CompleteAsync(
                    "You are a financial advisor that returns clean HTML only.",
                    prompt,
                    0.7);

                await _convex.ActionAsAdminAsync("sendEmail:sendEmail", new
                {
                    to = user.GetProperty("email").GetString(),
                    subject = "Your Monthly Financial Insights",
                    html = $"""
                        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                          <h1 style="color:#2563eb;">Your Monthly Financial Insights</h1>
                          <p>Hi {user.GetProperty("name").GetString()},</p>
                          <p>Here's your personalized spending analysis for the past month.</p>
                          {htmlResponse}
                        </div>
                        """,
                });
                await Task.Delay(3000);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Spending insights failed for a user");
            }
        }
    }
}
