using Hangfire;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Splitter.Api.Convex;
using Splitter.Api.Jobs;
using System.Text.Json;

namespace Splitter.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/expenses")]
public sealed class ExpensesController : ConvexControllerBase
{
    public ExpensesController(IConvexClient convex) : base(convex)
    {
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] JsonElement body, CancellationToken cancellationToken)
    {
        try
        {
            var result = await Convex.MutationAsync("createExpense:createExpense", body, Token, cancellationToken);
            var id = result.ValueKind == JsonValueKind.String ? result.GetString() : result.GetRawText().Trim('"');
            if (!string.IsNullOrWhiteSpace(id))
            {
                BackgroundJob.Enqueue<EmbeddingJobs>(job => job.UpsertAsync("expenses", id));
            }

            return ToJson(result);
        }
        catch (ConvexException ex)
        {
            return StatusCode(ex.StatusCode, new { error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await Convex.MutationAsync(
                "individualExpenses:deleteExpense",
                new { expenseId = id },
                Token,
                cancellationToken);
            BackgroundJob.Enqueue<EmbeddingJobs>(job => job.DeleteAsync("expenses", id));
            return ToJson(result);
        }
        catch (ConvexException ex)
        {
            return StatusCode(ex.StatusCode, new { error = ex.Message });
        }
    }
}
