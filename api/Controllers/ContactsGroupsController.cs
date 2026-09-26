using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Splitter.Api.Convex;
using System.Text.Json;

namespace Splitter.Api.Controllers;

[ApiController]
[Authorize]
[Route("api")]
public sealed class ContactsGroupsController : ConvexControllerBase
{
    public ContactsGroupsController(IConvexClient convex) : base(convex)
    {
    }

    [HttpGet("contacts")]
    public Task<IActionResult> Contacts(CancellationToken cancellationToken)
        => Query("contacts:getAllContacts", new { }, cancellationToken);

    [HttpPost("groups")]
    public Task<IActionResult> CreateGroup([FromBody] JsonElement body, CancellationToken cancellationToken)
        => Mutate("contacts:createGroup", body, cancellationToken);

    [HttpGet("groups/mine")]
    public Task<IActionResult> Mine(CancellationToken cancellationToken)
        => Query("groupExpenses:getUserGroupsWithMembers", new { }, cancellationToken);

    [HttpGet("groups/{id}")]
    public Task<IActionResult> Group(string id, CancellationToken cancellationToken)
        => Query("groupExpenses:getGroupExpenses", new { groupId = id }, cancellationToken);
}
