using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Splitter.Api.Convex;

namespace Splitter.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/users")]
public sealed class UsersController : ConvexControllerBase
{
    public UsersController(IConvexClient convex) : base(convex)
    {
    }

    [HttpPost("me")]
    public Task<IActionResult> Store(CancellationToken cancellationToken)
        => Mutate("users:store", new { }, cancellationToken);

    [HttpGet("me")]
    public Task<IActionResult> Me(CancellationToken cancellationToken)
        => Query("users:getCurrentUser", new { }, cancellationToken);

    [HttpGet("search")]
    public Task<IActionResult> Search([FromQuery] string q, CancellationToken cancellationToken)
        => Query("users:searchUsers", new { query = q ?? string.Empty }, cancellationToken);

    [HttpGet("{id}")]
    public Task<IActionResult> GetById(string id, CancellationToken cancellationToken)
        => Query("users:getUserById", new { id }, cancellationToken);
}
