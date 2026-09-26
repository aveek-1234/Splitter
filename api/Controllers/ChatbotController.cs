using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Splitter.Api.Ai;
using Splitter.Api.Convex;
using System.Text.Json;

namespace Splitter.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/chatbot")]
public sealed class ChatbotController : ConvexControllerBase
{
    private readonly ChatbotService _chatbot;

    public ChatbotController(IConvexClient convex, ChatbotService chatbot) : base(convex)
    {
        _chatbot = chatbot;
    }

    [HttpGet("context")]
    public Task<IActionResult> Context(CancellationToken cancellationToken)
        => Query("chatbot:getExpenseChatContext", new { }, cancellationToken);

    [HttpPost("ask")]
    public async Task<IActionResult> Ask([FromBody] JsonElement body, CancellationToken cancellationToken)
    {
        var question = body.TryGetProperty("question", out var q) ? q.GetString()?.Trim() : null;
        if (string.IsNullOrWhiteSpace(question))
        {
            return BadRequest(new { error = "Please provide a question about your expenses." });
        }

        try
        {
            var token = Token ?? throw new ConvexException("Unauthorized", 401);
            var result = await _chatbot.AskAsync(question, token, cancellationToken);
            return Ok(result);
        }
        catch (ConvexException ex)
        {
            return StatusCode(ex.StatusCode, new { error = ex.Message });
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex);
            return StatusCode(500, new
            {
                answer = "I hit a temporary issue while checking your expenses. Please try again in a moment.",
                sources = Array.Empty<object>(),
            });
        }
    }
}
