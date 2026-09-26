using Hangfire;
using Hangfire.MemoryStorage;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Splitter.Api.Ai;
using Splitter.Api.Convex;
using Splitter.Api.Jobs;

var builder = WebApplication.CreateBuilder(args);

var configuredIssuer = builder.Configuration["Clerk:Issuer"];
var clerkIssuer = NormalizeIssuer(
    string.IsNullOrWhiteSpace(configuredIssuer)
        ? Environment.GetEnvironmentVariable("CLERK_JWT_ISSUER_DOMAIN") ?? string.Empty
        : configuredIssuer);

builder.Services.AddControllers();
builder.Services.AddHttpContextAccessor();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyHeader()
            .AllowAnyMethod()
            .SetIsOriginAllowed(_ => true)
            .AllowCredentials();
    });
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = clerkIssuer;
        options.RequireHttpsMetadata = clerkIssuer.StartsWith("https://", StringComparison.OrdinalIgnoreCase);
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = !string.IsNullOrWhiteSpace(clerkIssuer),
            ValidIssuer = clerkIssuer,
            ValidateAudience = false,
            ValidateLifetime = true,
            NameClaimType = "sub",
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddHttpClient<IConvexClient, ConvexClient>();
builder.Services.AddHttpClient<OllamaClient>();
builder.Services.AddHttpClient<QdrantClient>();
builder.Services.AddHttpClient<GroqClient>();
builder.Services.AddScoped<ChatbotService>();
builder.Services.AddTransient<EmbeddingJobs>();
builder.Services.AddTransient<EmailJobs>();
builder.Services.AddTransient<ExportJobs>();

builder.Services.AddHangfire(config => config.UseMemoryStorage());
builder.Services.AddHangfireServer();

var app = builder.Build();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Lifetime.ApplicationStarted.Register(() =>
{
    RecurringJob.AddOrUpdate<EmailJobs>(
        "payment-reminders",
        job => job.SendPaymentRemindersAsync(),
        Cron.Daily(10));
    RecurringJob.AddOrUpdate<EmailJobs>(
        "spending-insights",
        job => job.SendSpendingInsightsAsync(),
        Cron.Daily(10));
});

app.Run();

static string NormalizeIssuer(string issuer)
{
    if (string.IsNullOrWhiteSpace(issuer))
    {
        return issuer;
    }

    return issuer.StartsWith("http", StringComparison.OrdinalIgnoreCase)
        ? issuer.TrimEnd('/')
        : $"https://{issuer.Trim().TrimEnd('/')}";
}
