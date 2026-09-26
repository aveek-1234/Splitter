using Hangfire;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Splitter.Api.Convex;
using Splitter.Api.Jobs;
using System.Text.Json;

namespace Splitter.Api.Controllers;

[ApiController]
[Authorize]
public sealed class SettlementsTransactionsController : ConvexControllerBase
{
    public SettlementsTransactionsController(IConvexClient convex) : base(convex)
    {
    }

    [HttpGet("api/users/{id}/expenses")]
    public Task<IActionResult> IndividualExpenses(string id, CancellationToken cancellationToken)
        => Query("individualExpenses:getIndividualExpenses", new { userId = id }, cancellationToken);

    [HttpGet("api/settlements")]
    public Task<IActionResult> GetSettlements([FromQuery] string type, [FromQuery] string id, CancellationToken cancellationToken)
        => Query("settlement:getSettlements", new { type, id }, cancellationToken);

    [HttpPost("api/settlements")]
    public async Task<IActionResult> CreateSettlement([FromBody] JsonElement body, CancellationToken cancellationToken)
    {
        try
        {
            var result = await Convex.MutationAsync("settlement:createSettlement", body, Token, cancellationToken);
            var id = result.ValueKind == JsonValueKind.String ? result.GetString() : result.GetRawText().Trim('"');
            if (!string.IsNullOrWhiteSpace(id))
            {
                BackgroundJob.Enqueue<EmbeddingJobs>(job => job.UpsertAsync("settlements", id));
            }

            return ToJson(result);
        }
        catch (ConvexException ex)
        {
            return StatusCode(ex.StatusCode, new { error = ex.Message });
        }
    }

    [HttpGet("api/transactions")]
    public Task<IActionResult> Transactions(CancellationToken cancellationToken)
        => Query("userTransactions:getUserTransactions", new { }, cancellationToken);

    [HttpPost("api/exports")]
    public async Task<IActionResult> Export([FromBody] JsonElement body, CancellationToken cancellationToken)
    {
        try
        {
            var me = await Convex.QueryAsync("users:getCurrentUser", new { }, Token, cancellationToken);
            var email = me.GetProperty("email").GetString();
            if (string.IsNullOrWhiteSpace(email))
            {
                return BadRequest(new { error = "User email is missing" });
            }

            var transactions = body.TryGetProperty("transactions", out var list) ? list.GetRawText() : "[]";
            BackgroundJob.Enqueue<ExportJobs>(job => job.ExportTransactionsAsync(email, transactions));
            return Ok(new { success = true });
        }
        catch (ConvexException ex)
        {
            return StatusCode(ex.StatusCode, new { error = ex.Message });
        }
    }
}
