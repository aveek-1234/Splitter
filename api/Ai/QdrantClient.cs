using System.Text.Json;

namespace Splitter.Api.Ai;

public sealed class QdrantClient
{
    private readonly HttpClient _http;
    private readonly string _collection;

    public QdrantClient(HttpClient http, IConfiguration configuration)
    {
        _http = http;
        var baseUrl = (configuration["Qdrant:Url"]
            ?? Environment.GetEnvironmentVariable("QDRANT_URL")
            ?? "http://localhost:6333").TrimEnd('/');
        _http.BaseAddress = new Uri(baseUrl + "/");
        _collection = configuration["Qdrant:Collection"]
            ?? Environment.GetEnvironmentVariable("QDRANT_COLLECTION")
            ?? "splitter_embeddings";
    }

    public string Collection => _collection;

    public async Task EnsureCollectionAsync(CancellationToken cancellationToken = default)
    {
        using var existing = await _http.GetAsync($"collections/{Uri.EscapeDataString(_collection)}", cancellationToken);
        if (existing.IsSuccessStatusCode)
        {
            return;
        }

        using var create = await _http.PutAsJsonAsync(
            $"collections/{Uri.EscapeDataString(_collection)}",
            new
            {
                vectors = new { size = 768, distance = "Cosine" },
            },
            cancellationToken);

        if (!create.IsSuccessStatusCode)
        {
            var text = await create.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"Qdrant collection setup failed: {(int)create.StatusCode} {text}");
        }
    }

    public async Task<List<QdrantSearchHit>> SearchAsync(float[] vector, int limit, CancellationToken cancellationToken = default)
    {
        using var response = await _http.PostAsJsonAsync(
            $"collections/{Uri.EscapeDataString(_collection)}/points/search",
            new
            {
                vector,
                limit,
                with_payload = true,
            },
            cancellationToken);

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Qdrant search failed: {(int)response.StatusCode} {body}");
        }

        using var document = JsonDocument.Parse(body);
        var hits = new List<QdrantSearchHit>();
        if (!document.RootElement.TryGetProperty("result", out var result) || result.ValueKind != JsonValueKind.Array)
        {
            return hits;
        }

        foreach (var item in result.EnumerateArray())
        {
            var score = item.TryGetProperty("score", out var scoreEl) ? scoreEl.GetDouble() : 0;
            var payload = item.TryGetProperty("payload", out var payloadEl) ? payloadEl.Clone() : default;
            hits.Add(new QdrantSearchHit(score, payload));
        }

        return hits;
    }

    public async Task UpsertAsync(IReadOnlyList<QdrantPoint> points, CancellationToken cancellationToken = default)
    {
        using var response = await _http.PutAsJsonAsync(
            $"collections/{Uri.EscapeDataString(_collection)}/points?wait=true",
            new
            {
                points = points.Select(point => new
                {
                    id = point.Id,
                    vector = point.Vector,
                    payload = point.Payload,
                }),
            },
            cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var text = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"Qdrant upsert failed: {(int)response.StatusCode} {text}");
        }
    }

    public async Task DeleteAsync(string id, CancellationToken cancellationToken = default)
    {
        using var response = await _http.PostAsJsonAsync(
            $"collections/{Uri.EscapeDataString(_collection)}/points/delete",
            new { ids = new[] { id } },
            cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var text = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"Qdrant delete failed: {(int)response.StatusCode} {text}");
        }
    }
}

public sealed record QdrantSearchHit(double Score, JsonElement Payload);

public sealed record QdrantPoint(string Id, float[] Vector, object Payload);
