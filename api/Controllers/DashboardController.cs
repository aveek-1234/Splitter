using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Splitter.Api.Convex;

namespace Splitter.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/dashboard")]
public sealed class DashboardController : ConvexControllerBase
{
    public DashboardController(IConvexClient convex) : base(convex)
    {
    }

    [HttpGet("balances")]
    public Task<IActionResult> Balances(CancellationToken cancellationToken)
        => Query("dashboard:getUserBalances", new { }, cancellationToken);

    [HttpGet("spent")]
    public Task<IActionResult> Spent(CancellationToken cancellationToken)
        => Query("dashboard:getTotalSpent", new { }, cancellationToken);

    [HttpGet("groups")]
    public Task<IActionResult> Groups(CancellationToken cancellationToken)
        => Query("dashboard:getGroupExpenses", new { }, cancellationToken);
}
