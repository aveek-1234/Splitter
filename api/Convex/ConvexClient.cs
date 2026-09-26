using System.Net.Http.Headers;
using System.Text.Json;

namespace Splitter.Api.Convex;

public sealed class ConvexException : Exception
{
    public int StatusCode { get; }

    public ConvexException(string message, int statusCode = 400) : base(message)
    {
        StatusCode = statusCode;
    }
}

public interface IConvexClient
{
    Task<JsonElement> QueryAsync(string path, object? args, string? bearerToken, CancellationToken cancellationToken = default);
    Task<JsonElement> MutationAsync(string path, object? args, string? bearerToken, CancellationToken cancellationToken = default);
    Task<JsonElement> ActionAsync(string path, object? args, string? bearerToken, CancellationToken cancellationToken = default);
    Task<JsonElement> QueryAsAdminAsync(string path, object? args, CancellationToken cancellationToken = default);
    Task<JsonElement> ActionAsAdminAsync(string path, object? args, CancellationToken cancellationToken = default);
}

public sealed class ConvexClient : IConvexClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    private readonly HttpClient _http;
    private readonly string _adminToken;

    public ConvexClient(HttpClient http, IConfiguration configuration)
    {
        _http = http;
        var baseUrl = FirstNonEmpty(
            configuration["Convex:Url"],
            Environment.GetEnvironmentVariable("CONVEX_URL"),
            Environment.GetEnvironmentVariable("NEXT_PUBLIC_CONVEX_URL"))
            ?? throw new InvalidOperationException("Convex:Url / CONVEX_URL is required.");

        _http.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
        _adminToken = FirstNonEmpty(
            configuration["Convex:AdminToken"],
            Environment.GetEnvironmentVariable("CONVEX_ADMIN_TOKEN"))
            ?? string.Empty;
    }

    public Task<JsonElement> QueryAsync(string path, object? args, string? bearerToken, CancellationToken cancellationToken = default)
        => SendAsync("api/query", path, args, bearerToken, cancellationToken);

    public Task<JsonElement> MutationAsync(string path, object? args, string? bearerToken, CancellationToken cancellationToken = default)
        => SendAsync("api/mutation", path, args, bearerToken, cancellationToken);

    public Task<JsonElement> ActionAsync(string path, object? args, string? bearerToken, CancellationToken cancellationToken = default)
        => SendAsync("api/action", path, args, bearerToken, cancellationToken);

    public Task<JsonElement> QueryAsAdminAsync(string path, object? args, CancellationToken cancellationToken = default)
        => SendAsync("api/query", path, args, string.IsNullOrWhiteSpace(_adminToken) ? null : _adminToken, cancellationToken);

    public Task<JsonElement> ActionAsAdminAsync(string path, object? args, CancellationToken cancellationToken = default)
        => SendAsync("api/action", path, args, string.IsNullOrWhiteSpace(_adminToken) ? null : _adminToken, cancellationToken);

    private async Task<JsonElement> SendAsync(
        string endpoint,
        string path,
        object? args,
        string? bearerToken,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
        if (!string.IsNullOrWhiteSpace(bearerToken))
        {
            var token = bearerToken.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                ? bearerToken["Bearer ".Length..]
                : bearerToken;
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        JsonElement argsElement = args switch
        {
            null => JsonSerializer.SerializeToElement(new Dictionary<string, object>()),
            JsonElement element => element,
            _ => JsonSerializer.SerializeToElement(args, JsonOptions),
        };

        request.Content = JsonContent.Create(new
        {
            path,
            args = argsElement,
            format = "json",
        });

        using var response = await _http.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new ConvexException(
                string.IsNullOrWhiteSpace(body) ? response.ReasonPhrase ?? "Convex request failed" : body,
                (int)response.StatusCode);
        }

        using var document = JsonDocument.Parse(string.IsNullOrWhiteSpace(body) ? "{}" : body);
        var root = document.RootElement;

        if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("status", out var status))
        {
            var statusText = status.GetString();
            if (string.Equals(statusText, "error", StringComparison.OrdinalIgnoreCase))
            {
                var message = root.TryGetProperty("errorMessage", out var errorMessage)
                    ? errorMessage.GetString()
                    : "Convex function failed";
                var code = message is not null && message.Contains("not authenticated", StringComparison.OrdinalIgnoreCase)
                    ? 401
                    : 400;
                throw new ConvexException(message ?? "Convex function failed", code);
            }

            if (root.TryGetProperty("value", out var value))
            {
                return value.Clone();
            }
        }

        return root.Clone();
    }

    private static string? FirstNonEmpty(params string?[] values)
        => values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value));
}
