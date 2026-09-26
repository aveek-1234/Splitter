namespace Splitter.Api.Auth;

public static class HttpContextToken
{
    public static string? GetBearerToken(this HttpContext context)
    {
        var header = context.Request.Headers.Authorization.ToString();
        if (string.IsNullOrWhiteSpace(header))
        {
            return null;
        }

        return header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? header["Bearer ".Length..].Trim()
            : header.Trim();
    }
}
