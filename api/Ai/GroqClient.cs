using System.Text.Json;
using System.Text.Json.Nodes;

namespace Splitter.Api.Ai;

public sealed record GroqToolCall(string Id, string Name, string Arguments);

public sealed class GroqChatTurn
{
    public string Content { get; init; } = string.Empty;
    public IReadOnlyList<GroqToolCall> ToolCalls { get; init; } = [];
    public JsonObject AssistantMessage { get; init; } = new();
}

public sealed class GroqClient
{
    private readonly HttpClient _http;
    private readonly string _model;
    private readonly string _apiKey;

    public GroqClient(HttpClient http, IConfiguration configuration)
    {
        _http = http;
        var apiKey = configuration["Groq:ApiKey"]
            ?? Environment.GetEnvironmentVariable("GROQ_API_KEY")
            ?? string.Empty;
        var baseUrl = (configuration["Groq:BaseUrl"]
            ?? "https://api.groq.com/openai/v1").TrimEnd('/');
        _http.BaseAddress = new Uri(baseUrl + "/");
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            _http.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);
        }
        _model = configuration["Groq:Model"] ?? "llama-3.3-70b-versatile";
        _apiKey = apiKey;
    }

    public async Task<string> CompleteAsync(
        string systemMessage,
        string userMessage,
        double temperature = 0.2,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            throw new InvalidOperationException("GROQ_API_KEY is required.");
        }

        using var response = await _http.PostAsJsonAsync("chat/completions", new
        {
            model = _model,
            temperature,
            max_tokens = 1024,
            messages = new[]
            {
                new { role = "system", content = systemMessage },
                new { role = "user", content = userMessage },
            },
        }, cancellationToken);

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Groq request failed: {(int)response.StatusCode} {body}");
        }

        using var document = JsonDocument.Parse(body);
        var content = document.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString();

        return string.IsNullOrWhiteSpace(content)
            ? throw new InvalidOperationException("Groq returned an empty completion.")
            : content.Trim();
    }

    public async Task<GroqChatTurn> ChatAsync(
        IReadOnlyList<JsonObject> messages,
        JsonArray tools,
        double temperature = 0.2,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            throw new InvalidOperationException("GROQ_API_KEY is required.");
        }

        var payload = new JsonObject
        {
            ["model"] = _model,
            ["temperature"] = temperature,
            ["max_tokens"] = 1024,
            ["messages"] = new JsonArray(messages.Select(message => message.DeepClone()).ToArray()),
            ["tools"] = tools.DeepClone(),
            ["tool_choice"] = "auto",
        };

        using var response = await _http.PostAsync(
            "chat/completions",
            new StringContent(payload.ToJsonString(), System.Text.Encoding.UTF8, "application/json"),
            cancellationToken);

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Groq request failed: {(int)response.StatusCode} {body}");
        }

        using var document = JsonDocument.Parse(body);
        var message = document.RootElement.GetProperty("choices")[0].GetProperty("message");
        var content = message.TryGetProperty("content", out var contentEl) && contentEl.ValueKind == JsonValueKind.String
            ? contentEl.GetString() ?? string.Empty
            : string.Empty;

        var toolCalls = new List<GroqToolCall>();
        var assistant = new JsonObject
        {
            ["role"] = "assistant",
            ["content"] = string.IsNullOrWhiteSpace(content) ? null : content,
        };

        if (message.TryGetProperty("tool_calls", out var calls) && calls.ValueKind == JsonValueKind.Array)
        {
            var serializedCalls = new JsonArray();
            foreach (var call in calls.EnumerateArray())
            {
                var id = call.GetProperty("id").GetString() ?? Guid.NewGuid().ToString("N");
                var function = call.GetProperty("function");
                var name = function.GetProperty("name").GetString() ?? string.Empty;
                var arguments = function.TryGetProperty("arguments", out var argsEl)
                    ? argsEl.GetString() ?? "{}"
                    : "{}";
                toolCalls.Add(new GroqToolCall(id, name, arguments));
                serializedCalls.Add(new JsonObject
                {
                    ["id"] = id,
                    ["type"] = "function",
                    ["function"] = new JsonObject
                    {
                        ["name"] = name,
                        ["arguments"] = arguments,
                    },
                });
            }

            assistant["tool_calls"] = serializedCalls;
        }

        return new GroqChatTurn
        {
            Content = content.Trim(),
            ToolCalls = toolCalls,
            AssistantMessage = assistant,
        };
    }
}
