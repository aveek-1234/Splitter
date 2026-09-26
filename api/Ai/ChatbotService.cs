using System.Globalization;
using System.Text.Json;
using Splitter.Api.Convex;

namespace Splitter.Api.Ai;

public sealed class ChatbotService
{
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
        var structuredContext = await _convex.QueryAsync("chatbot:getExpenseChatContext", new { }, bearerToken, cancellationToken);
        var dateContext = GetCurrentDateContext();

        var sources = new List<object>();
        var ragSection = "No additional vector-search records were retrieved.";

        try
        {
            var embedding = await _ollama.EmbedAsync(question, cancellationToken);
            var hits = await _qdrant.SearchAsync(embedding, 5, cancellationToken);
            if (hits.Count > 0)
            {
                ragSection = string.Join("\n\n", hits.Select((hit, index) =>
                    $"Related record {index + 1}:\n{hit.Payload}"));
                sources.AddRange(hits.Select(hit => new { score = hit.Score, payload = hit.Payload }));
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"RAG enrichment skipped: {ex.Message}");
        }

        var prompt = string.Join("\n", new[]
        {
            "You are Splitter's expense assistant.",
            "Answer using the structured expense context below as your primary source of truth.",
            "When the user asks for totals, balances, or what they still need to settle, calculate from expenses, settlements, and balances in the context.",
            "Positive netBalance means the counterparty owes the user; negative means the user owes the counterparty.",
            "For relative dates (today, this week, this month, last month), use the current date context.",
            "You may also use related vector-search records for fuzzy recall across history.",
            "If the data does not contain the answer, say so clearly. Never invent transactions.",
            "",
            $"Current date context:\n{JsonSerializer.Serialize(dateContext)}",
            "",
            $"Structured expense context:\n{structuredContext}",
            "",
            $"Related vector-search records:\n{ragSection}",
            "",
            $"User question:\n{question}",
        });

        var answer = await _groq.CompleteAsync(
            "You are Splitter's expense assistant. Calculate numbers from the provided structured context when needed. Be friendly and practical.",
            prompt,
            0.2,
            cancellationToken);

        return new { answer, sources };
    }

    private static object GetCurrentDateContext()
    {
        var now = DateTimeOffset.UtcNow;
        return new
        {
            date = now.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            label = now.ToString("dddd, MMMM d, yyyy", CultureInfo.InvariantCulture),
            month = now.ToString("MMMM yyyy", CultureInfo.InvariantCulture),
            timeZone = "UTC",
        };
    }
}
