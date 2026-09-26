using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Splitter.Api.Convex;
using System.Text.Json;

namespace Splitter.Api.Jobs;

public sealed class ExportJobs
{
    private readonly IConvexClient _convex;
    private readonly ILogger<ExportJobs> _logger;

    public ExportJobs(IConvexClient convex, ILogger<ExportJobs> logger)
    {
        _convex = convex;
        _logger = logger;
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public async Task ExportTransactionsAsync(string email, string transactionsJson)
    {
        try
        {
            using var document = JsonDocument.Parse(string.IsNullOrWhiteSpace(transactionsJson) ? "[]" : transactionsJson);
            var transactions = document.RootElement.ValueKind == JsonValueKind.Array
                ? document.RootElement.EnumerateArray().Select(x => x.Clone()).ToList()
                : new List<JsonElement>();

            var pdfBytes = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Margin(40);
                    page.Size(PageSizes.A4);
                    page.Header().Text("SplitterHub Transaction Export").FontSize(24).Bold().AlignCenter();
                    page.Content().PaddingTop(20).Column(column =>
                    {
                        column.Item().Text($"Generated At: {DateTime.Now}").FontSize(12);
                        column.Item().PaddingTop(16);
                        var index = 1;
                        foreach (var transaction in transactions)
                        {
                            var display = GetString(transaction, "displayText") ?? $"Transaction {index}";
                            column.Item().Text($"{index}. {display}").FontSize(16);
                            column.Item().Text($"Type: {GetString(transaction, "typeOfTransaction")}").FontSize(12);
                            column.Item().Text($"Amount: ₹{GetNumber(transaction, "amount"):F2}").FontSize(12);
                            column.Item().Text($"Name: {GetString(transaction, "name")}").FontSize(12);
                            var date = GetNumber(transaction, "date");
                            if (date > 0)
                            {
                                column.Item().Text($"Date: {DateTimeOffset.FromUnixTimeMilliseconds((long)date).LocalDateTime:d}").FontSize(12);
                            }
                            var description = GetString(transaction, "description");
                            if (!string.IsNullOrWhiteSpace(description))
                            {
                                column.Item().Text($"Description: {description}").FontSize(12);
                            }
                            column.Item().PaddingVertical(8).LineHorizontal(1);
                            index++;
                        }
                    });
                });
            }).GeneratePdf();

            await _convex.ActionAsAdminAsync("sendEmail:sendEmail", new
            {
                to = email,
                subject = "Your Transaction Export",
                html = "<div><h1>Transaction Export</h1><p>Please find your exported transactions attached.</p></div>",
                text = "Your transaction export is attached.",
                attachments = new[]
                {
                    new
                    {
                        filename = "transactions.pdf",
                        content = Convert.ToBase64String(pdfBytes),
                    },
                },
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to export transactions for {Email}", email);
            throw;
        }
    }

    private static string? GetString(JsonElement element, string name)
        => element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    private static double GetNumber(JsonElement element, string name)
        => element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.Number
            ? value.GetDouble()
            : 0;
}
