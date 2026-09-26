using System.Text.Json;

namespace Splitter.Api.Ai;

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
}
