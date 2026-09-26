using System.Text.Json;

namespace Splitter.Api.Ai;

public sealed class OllamaClient
{
    private readonly HttpClient _http;
    private readonly string _model;

    public OllamaClient(HttpClient http, IConfiguration configuration)
    {
        _http = http;
        var baseUrl = (configuration["Ollama:BaseUrl"]
            ?? Environment.GetEnvironmentVariable("OLLAMA_BASE_URL")
            ?? "http://localhost:11434").TrimEnd('/');
        _http.BaseAddress = new Uri(baseUrl + "/");
        _model = configuration["Ollama:EmbedModel"]
            ?? Environment.GetEnvironmentVariable("OLLAMA_EMBED_MODEL")
            ?? "nomic-embed-text";
    }

    public async Task<float[]> EmbedAsync(string text, CancellationToken cancellationToken = default)
    {
        var embeddings = await EmbedManyAsync(new[] { text }, cancellationToken);
        return embeddings[0];
    }

    public async Task<List<float[]>> EmbedManyAsync(IReadOnlyList<string> texts, CancellationToken cancellationToken = default)
    {
        using var response = await _http.PostAsJsonAsync("api/embed", new
        {
            model = _model,
            input = texts,
        }, cancellationToken);

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Ollama embedding failed: {(int)response.StatusCode} {body}");
        }

        using var document = JsonDocument.Parse(body);
        var root = document.RootElement;
        var result = new List<float[]>();

        if (root.TryGetProperty("embeddings", out var embeddings) && embeddings.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in embeddings.EnumerateArray())
            {
                result.Add(item.EnumerateArray().Select(x => x.GetSingle()).ToArray());
            }
        }
        else if (root.TryGetProperty("embedding", out var embedding) && embedding.ValueKind == JsonValueKind.Array)
        {
            result.Add(embedding.EnumerateArray().Select(x => x.GetSingle()).ToArray());
        }

        if (result.Count != texts.Count)
        {
            throw new InvalidOperationException($"Ollama returned {result.Count} embeddings for {texts.Count} texts.");
        }

        return result;
    }
}
