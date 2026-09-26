using Microsoft.AspNetCore.Mvc;
using Splitter.Api.Auth;
using Splitter.Api.Convex;
using System.Text.Json;

namespace Splitter.Api.Controllers;

public abstract class ConvexControllerBase : ControllerBase
{
    protected readonly IConvexClient Convex;

    protected ConvexControllerBase(IConvexClient convex)
    {
        Convex = convex;
    }

    protected string? Token => HttpContext.GetBearerToken();

    protected async Task<IActionResult> Query(string path, object? args = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await Convex.QueryAsync(path, args, Token, cancellationToken);
            return ToJson(result);
        }
        catch (ConvexException ex)
        {
            return StatusCode(ex.StatusCode, new { error = ex.Message });
        }
    }

    protected async Task<IActionResult> Mutate(string path, object? args = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await Convex.MutationAsync(path, args, Token, cancellationToken);
            return ToJson(result);
        }
        catch (ConvexException ex)
        {
            return StatusCode(ex.StatusCode, new { error = ex.Message });
        }
    }

    protected IActionResult ToJson(JsonElement result)
        => Content(result.GetRawText(), "application/json");
}
