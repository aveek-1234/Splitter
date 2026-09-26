using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;
using Splitter.Api.Convex;

namespace Splitter.Api.Ai;

public sealed class ChatbotService
{
    private const int MaxToolRounds = 6;

    private readonly IConvexClient _convex;
    private readonly OllamaClient _ollama;
    private readonly QdrantClient _qdrant;
    private readonly GroqClient _groq;

    public ChatbotService(IConvexClient convex, OllamaClient ollama, QdrantClient qdrant, GroqClient groq)
    {
        _convex = convex;
        _ollama = ollama;
        _qdrant = qdrant;
        _groq = groq;
    }

    public async Task<object> AskAsync(string question, string bearerToken, CancellationToken cancellationToken)
    {
        var dateContext = GetCurrentDateContext();
        var sources = new List<object>();
        var toolsUsed = new List<string>();
        var messages = new List<JsonObject>
        {
            new()
            {
                ["role"] = "system",
                ["content"] = BuildSystemPrompt(dateContext),
            },
            new()
            {
                ["role"] = "user",
                ["content"] = question,
            },
        };

        for (var round = 0; round < MaxToolRounds; round++)
        {
            var turn = await _groq.ChatAsync(messages, ToolDefinitions, 0.2, cancellationToken);
            if (turn.ToolCalls.Count == 0)
            {
                return new
                {
                    answer = string.IsNullOrWhiteSpace(turn.Content)
                        ? "I couldn't generate an answer right now."
                        : turn.Content,
                    sources,
                    toolsUsed,
                    ragUsed = toolsUsed.Contains("search_related") || sources.Count > 0,
                };
            }

            messages.Add(turn.AssistantMessage);
            foreach (var call in turn.ToolCalls)
            {
                toolsUsed.Add(call.Name);
                var result = await ExecuteToolAsync(call, bearerToken, sources, cancellationToken);
                messages.Add(new JsonObject
                {
                    ["role"] = "tool",
                    ["tool_call_id"] = call.Id,
                    ["content"] = result,
                });
            }
        }

        return new
        {
            answer = "I couldn't finish that question in time. Please try a more specific question.",
            sources,
            toolsUsed,
            ragUsed = toolsUsed.Contains("search_related") || sources.Count > 0,
        };
    }

    private async Task<string> ExecuteToolAsync(
        GroqToolCall call,
        string bearerToken,
        List<object> sources,
        CancellationToken cancellationToken)
    {
        try
        {
            using var arguments = JsonDocument.Parse(string.IsNullOrWhiteSpace(call.Arguments) ? "{}" : call.Arguments);
            var root = arguments.RootElement;

            return call.Name switch
            {
                "get_balances" => await QueryJson("chatbot:getBalancesForCurrentUser", new { }, bearerToken, cancellationToken),
                "get_spending_summary" => await QueryJson(
                    "chatbot:getSpendingSummaryForCurrentUser",
                    OptionalArgs(root, "month", "category"),
                    bearerToken,
                    cancellationToken),
                "list_expenses" => await QueryJson(
                    "chatbot:listExpensesForCurrentUser",
                    ExpenseArgs(root),
                    bearerToken,
                    cancellationToken),
                "list_settlements" => await QueryJson(
                    "chatbot:listSettlementsForCurrentUser",
                    SettlementArgs(root),
                    bearerToken,
                    cancellationToken),
                "search_related" => await SearchRelatedAsync(root, sources, cancellationToken),
                _ => JsonSerializer.Serialize(new { error = $"Unknown tool {call.Name}" }),
            };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Tool {call.Name} failed: {ex.Message}");
            return JsonSerializer.Serialize(new { error = $"{call.Name} is unavailable right now." });
        }
    }

    private async Task<string> QueryJson(string path, object args, string bearerToken, CancellationToken cancellationToken)
    {
        var data = await _convex.QueryAsync(path, args, bearerToken, cancellationToken);
        return data.GetRawText();
    }

    private async Task<string> SearchRelatedAsync(JsonElement root, List<object> sources, CancellationToken cancellationToken)
    {
        var question = ReadString(root, "question");
        if (string.IsNullOrWhiteSpace(question))
        {
            return JsonSerializer.Serialize(new { error = "search_related requires a question.", results = Array.Empty<object>() });
        }

        var limit = ReadInt(root, "limit") ?? 5;
        var embedding = await _ollama.EmbedAsync(question, cancellationToken);
        var hits = await _qdrant.SearchAsync(embedding, limit, cancellationToken);
        foreach (var hit in hits)
        {
            sources.Add(new { score = hit.Score, payload = hit.Payload });
        }

        return JsonSerializer.Serialize(hits.Select(hit => new
        {
            score = hit.Score,
            payload = hit.Payload,
        }));
    }

    private static Dictionary<string, object?> OptionalArgs(JsonElement root, params string[] names)
    {
        var args = new Dictionary<string, object?>();
        foreach (var name in names)
        {
            var value = ReadString(root, name);
            if (!string.IsNullOrWhiteSpace(value))
            {
                args[name] = value;
            }
        }

        return args;
    }

    private static Dictionary<string, object?> ExpenseArgs(JsonElement root)
    {
        var args = OptionalArgs(root, "category", "month", "groupName");
        var limit = ReadInt(root, "limit");
        if (limit is > 0)
        {
            args["limit"] = Math.Min(limit.Value, 100);
        }

        return args;
    }

    private static Dictionary<string, object?> SettlementArgs(JsonElement root)
    {
        var args = OptionalArgs(root, "month");
        var limit = ReadInt(root, "limit");
        if (limit is > 0)
        {
            args["limit"] = Math.Min(limit.Value, 100);
        }

        return args;
    }

    private static string? ReadString(JsonElement root, string name)
    {
        if (!root.TryGetProperty(name, out var value) || value.ValueKind != JsonValueKind.String)
        {
            return null;
        }

        var text = value.GetString()?.Trim();
        return string.IsNullOrWhiteSpace(text) ? null : text;
    }

    private static int? ReadInt(JsonElement root, string name)
    {
        if (!root.TryGetProperty(name, out var value))
        {
            return null;
        }

        if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var number))
        {
            return number;
        }

        if (value.ValueKind == JsonValueKind.String && int.TryParse(value.GetString(), out var parsed))
        {
            return parsed;
        }

        return null;
    }

    private static string BuildSystemPrompt(object dateContext)
    {
        return string.Join('\n',
        [
            "You are Splitter's expense assistant.",
            "Answer only using data returned by your tools. Never invent transactions, amounts, or people.",
            "When the user asks about totals, balances, categories, or settle-ups, call the appropriate tool before answering.",
            "For relative dates like today, this week, this month, yesterday, or last month, use the current date context below.",
            "When filtering by month, pass month as YYYY-MM (for example 2026-08).",
            "Positive netBalance means the counterparty owes the user; negative means the user owes the counterparty.",
            "If tool results do not contain the answer, say so clearly. Keep answers friendly and practical.",
            "",
            $"Current date context: {JsonSerializer.Serialize(dateContext)}",
        ]);
    }

    private static object GetCurrentDateContext()
    {
        var now = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, TimeZoneInfo.Local);
        return new
        {
            date = now.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            label = now.ToString("dddd, MMMM d, yyyy", CultureInfo.InvariantCulture),
            month = now.ToString("MMMM yyyy", CultureInfo.InvariantCulture),
            timeZone = TimeZoneInfo.Local.Id,
        };
    }

    private static readonly JsonArray ToolDefinitions = new(
        Tool("get_balances", "Get who owes the current user money and who the user still owes. Use for settle-up and balance questions.", """{"type":"object","properties":{},"additionalProperties":false}"""),
        Tool("get_spending_summary", "Get spending totals, category totals, and balance overview. Optionally filter by month (YYYY-MM) and/or category.", """{"type":"object","properties":{"month":{"type":"string","description":"Optional month filter as YYYY-MM, e.g. 2026-08"},"category":{"type":"string","description":"Optional expense category filter, e.g. food"}},"additionalProperties":false}"""),
        Tool("list_expenses", "List the user's expenses with optional filters for category, month (YYYY-MM), group name, and limit. Use for biggest expenses, category spend, or recent activity.", """{"type":"object","properties":{"category":{"type":"string","description":"Expense category filter"},"month":{"type":"string","description":"Month filter as YYYY-MM, e.g. 2026-08"},"groupName":{"type":"string","description":"Group name filter; use private/none for non-group expenses"},"limit":{"type":"number","description":"Max expenses to return (default 50, max 100)"}},"additionalProperties":false}"""),
        Tool("list_settlements", "List recent settlements/repayments for the current user. Optionally filter by month (YYYY-MM).", """{"type":"object","properties":{"month":{"type":"string","description":"Month filter as YYYY-MM, e.g. 2026-08"},"limit":{"type":"number","description":"Max settlements to return (default 50, max 100)"}},"additionalProperties":false}"""),
        Tool("search_related", "Fuzzy search related expense, settlement, group, or user records when the user refers to something vaguely (for example a trip nickname or old description).", """{"type":"object","properties":{"question":{"type":"string","description":"Search query derived from the user question"},"limit":{"type":"number","description":"Max related records to return (default 5)"}},"required":["question"],"additionalProperties":false}""")
    );

    private static JsonObject Tool(string name, string description, string parametersJson)
    {
        return new JsonObject
        {
            ["type"] = "function",
            ["function"] = new JsonObject
            {
                ["name"] = name,
                ["description"] = description,
                ["parameters"] = JsonNode.Parse(parametersJson),
            },
        };
    }
}
