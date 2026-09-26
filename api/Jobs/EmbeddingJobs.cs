using Splitter.Api.Ai;
using Splitter.Api.Convex;
using System.Text.Json;

namespace Splitter.Api.Jobs;

public sealed class EmbeddingJobs
{
    private readonly IConvexClient _convex;
    private readonly OllamaClient _ollama;
    private readonly QdrantClient _qdrant;
    private readonly ILogger<EmbeddingJobs> _logger;

    public EmbeddingJobs(
        IConvexClient convex,
        OllamaClient ollama,
        QdrantClient qdrant,
        ILogger<EmbeddingJobs> logger)
    {
        _convex = convex;
        _ollama = ollama;
        _qdrant = qdrant;
        _logger = logger;
    }

    public Task UpsertAsync(string sourceTable, string sourceId)
        => UpsertAsync(sourceTable, sourceId, CancellationToken.None);

    public async Task UpsertAsync(string sourceTable, string sourceId, CancellationToken cancellationToken)
    {
        await _qdrant.EnsureCollectionAsync(cancellationToken);
        var document = await _convex.QueryAsAdminAsync(
            "embeddings:getEmbeddableDocument",
            new { sourceTable, sourceId },
            cancellationToken);

        if (document.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
        {
            _logger.LogInformation("No embeddable document for {Table}:{Id}", sourceTable, sourceId);
            return;
        }

        var text = document.GetProperty("text").GetString() ?? string.Empty;
        var embeddings = await _ollama.EmbedManyAsync(new[] { text }, cancellationToken);
        var point = BuildPoint(document, embeddings[0]);
        await _qdrant.UpsertAsync(new[] { point }, cancellationToken);
    }

    public Task DeleteAsync(string sourceTable, string sourceId)
        => DeleteAsync(sourceTable, sourceId, CancellationToken.None);

    public async Task DeleteAsync(string sourceTable, string sourceId, CancellationToken cancellationToken)
    {
        var id = UuidV5.Create(UuidV5.DnsNamespace, $"{sourceTable}:{sourceId}").ToString();
        await _qdrant.DeleteAsync(id, cancellationToken);
    }

    public async Task BackfillAsync(int batchSize, CancellationToken cancellationToken)
    {
        await _qdrant.EnsureCollectionAsync(cancellationToken);
        var documents = await _convex.QueryAsAdminAsync("embeddings:getAllEmbeddableDocuments", new { }, cancellationToken);
        if (documents.ValueKind != JsonValueKind.Array)
        {
            return;
        }

        var list = documents.EnumerateArray().Select(d => d.Clone()).ToList();
        for (var i = 0; i < list.Count; i += batchSize)
        {
            var batch = list.Skip(i).Take(batchSize).ToList();
            var texts = batch.Select(doc => doc.GetProperty("text").GetString() ?? string.Empty).ToList();
            var embeddings = await _ollama.EmbedManyAsync(texts, cancellationToken);
            var points = batch.Select((doc, index) => BuildPoint(doc, embeddings[index])).ToList();
            await _qdrant.UpsertAsync(points, cancellationToken);
            await Task.Delay(500, cancellationToken);
        }
    }

    private static QdrantPoint BuildPoint(JsonElement document, float[] embedding)
    {
        var sourceTable = document.GetProperty("sourceTable").GetString() ?? "unknown";
        var sourceId = document.GetProperty("sourceId").GetString() ?? Guid.NewGuid().ToString();
        var id = UuidV5.Create(UuidV5.DnsNamespace, $"{sourceTable}:{sourceId}").ToString();
        return new QdrantPoint(id, embedding, new
        {
            sourceTable,
            sourceId,
            entityType = document.TryGetProperty("entityType", out var entityType) ? entityType.GetString() : sourceTable,
            entityId = document.TryGetProperty("entityId", out var entityId) ? entityId.GetString() : sourceId,
            text = document.TryGetProperty("text", out var text) ? text.GetString() : "",
            createdAt = document.TryGetProperty("createdAt", out var createdAt) && createdAt.ValueKind == JsonValueKind.Number
                ? createdAt.GetInt64()
                : 0,
        });
    }
}
