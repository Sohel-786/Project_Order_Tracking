// DATABASE ARCHITECTURE RULE:
// - Schema changes handled ONLY via EF Core migrations.
// - Data seeding handled ONLY via DbInitializer.
// - No runtime schema patching allowed.

using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using net_backend.Data;
using net_backend.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure Services
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICodeGeneratorService, CodeGeneratorService>();
builder.Services.AddScoped<IExcelService, ExcelService>();

builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
    options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(new[]
    {
        "application/json",
        "application/javascript",
        "text/css",
        "text/html",
        "image/svg+xml",
        "font/woff2"
    });
});
builder.Services.Configure<BrotliCompressionProviderOptions>(o => o.Level = System.IO.Compression.CompressionLevel.Fastest);
builder.Services.Configure<GzipCompressionProviderOptions>(o => o.Level = System.IO.Compression.CompressionLevel.Fastest);

// Configure Database
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Configure JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey))
    throw new InvalidOperationException("Jwt:Key is not configured.");
if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
    throw new InvalidOperationException("Jwt:Key must be at least 32 UTF-8 bytes for HS256.");

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                context.Token = context.Request.Cookies["access_token"];
                return Task.CompletedTask;
            }
        };
    });

// Configure CORS (same-origin IIS deploy does not rely on this; needed for dev or split origins)
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
corsOrigins = (corsOrigins ?? Array.Empty<string>())
    .Where(static o => !string.IsNullOrWhiteSpace(o))
    .Select(static o => o.Trim().TrimEnd('/'))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();
if (corsOrigins.Length == 0)
{
    corsOrigins = new[] { "http://localhost:3000", "http://localhost:3001" };
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy =>
        {
            policy.WithOrigins(corsOrigins)
                   .AllowAnyMethod()
                   .AllowAnyHeader()
                   .AllowCredentials()
                   .WithExposedHeaders("Content-Disposition");
        });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseForwardedHeaders();

app.UseResponseCompression();

// Next static export: routes are `<name>.html`. IIS often requests `/login/`; rewrite to `login.html` when present (QC_Tool pattern).
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value ?? "/";

    if (path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/_next/", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/storage/", StringComparison.OrdinalIgnoreCase))
    {
        await next();
        return;
    }

    if (!string.IsNullOrWhiteSpace(path) &&
        path != "/" &&
        Path.GetExtension(path) == string.Empty)
    {
        var trimmed = path.TrimEnd('/');
        var candidate = $"{trimmed}.html";
        var webRoot = app.Environment.WebRootPath;
        if (!string.IsNullOrEmpty(webRoot))
        {
            var physical = Path.Combine(webRoot, candidate.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            if (File.Exists(physical))
                context.Request.Path = candidate;
        }
    }

    await next();
});

// Ensure storage directory exists (uploads at runtime are served from /storage)
var storagePath = Path.Combine(builder.Environment.ContentRootPath, "wwwroot", "storage");
if (!Directory.Exists(storagePath))
{
    Directory.CreateDirectory(storagePath);
}

app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        var path = ctx.Context.Request.Path.Value ?? string.Empty;
        if (path.StartsWith("/_next/", StringComparison.OrdinalIgnoreCase) ||
            path.EndsWith(".js", StringComparison.OrdinalIgnoreCase) ||
            path.EndsWith(".css", StringComparison.OrdinalIgnoreCase) ||
            path.EndsWith(".woff2", StringComparison.OrdinalIgnoreCase) ||
            path.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ||
            path.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) ||
            path.EndsWith(".jpeg", StringComparison.OrdinalIgnoreCase) ||
            path.EndsWith(".webp", StringComparison.OrdinalIgnoreCase) ||
            path.EndsWith(".svg", StringComparison.OrdinalIgnoreCase))
        {
            ctx.Context.Response.Headers["Cache-Control"] = "public,max-age=31536000,immutable";
        }
        else if (path.EndsWith(".html", StringComparison.OrdinalIgnoreCase) || path == "/" || string.IsNullOrEmpty(path))
        {
            ctx.Context.Response.Headers["Cache-Control"] = "no-cache";
        }
    }
});

app.UseRouting();
app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// SPA fallback for routes that don't have a pre-generated static file.
// Keeps production behavior consistent with DiePattern.
app.MapFallbackToFile("index.html");

// Clean, migration-based database initialization
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    var aesKey = builder.Configuration["PasswordEncryption:Key"]
        ?? throw new InvalidOperationException("PasswordEncryption:Key is not configured.");
    
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        
        // 1. Schema: apply pending migrations
        context.Database.Migrate();

        // 2. Data: seed defaults
        DbInitializer.Initialize(context, aesKey);

        logger.LogInformation("Database initialized successfully (migrations and seeding).");
    }
    catch (Exception ex)
    {
        // Match QC_Tool: log and continue so IIS still hosts the app if SQL is misconfigured on a new machine.
        // Fix ConnectionStrings on the server and recycle the app pool; migrations will run on the next successful start.
        logger.LogError(ex, "An error occurred while initializing the database.");
    }
}

app.Run();
