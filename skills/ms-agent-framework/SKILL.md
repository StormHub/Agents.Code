---
name: ms-agent-framework
description: Microsoft Agent Framework (.NET) patterns for building AI agents with AG-UI protocol, tools, middleware, and ASP.NET Core hosting. Use when the spec references Agent Framework, AG-UI, or Microsoft.Agents packages.
---

# Microsoft Agent Framework (.NET)

Documentation: https://learn.microsoft.com/en-us/agent-framework/overview/?pivots=programming-language-csharp
Source: https://github.com/microsoft/agent-framework/tree/main/dotnet/samples/02-agents/AGUI

## NuGet Packages

| Package | Purpose |
|---------|---------|
| `Microsoft.Agents.AI` | Core framework: `AIAgent`, `ChatClientAgent`, `DelegatingAIAgent`, `AsAIAgent()` extension |
| `Microsoft.Agents.AI.AGUI` | AG-UI client: `AGUIChatClient` for connecting to AG-UI servers |
| `Microsoft.Agents.AI.Hosting.AGUI.AspNetCore` | AG-UI server hosting: `AddAGUI()`, `MapAGUI()` for ASP.NET Core |
| `Microsoft.Agents.AI.OpenAI` | OpenAI/Azure OpenAI integration via `IChatClient` |
| `Microsoft.Extensions.AI` | `IChatClient` abstraction, `AIFunctionFactory`, `AITool` |
| `Azure.AI.OpenAI` | Azure OpenAI client (`AzureOpenAIClient`) |
| `Azure.Identity` | Azure credential management (`DefaultAzureCredential`) |
| `OllamaSharp` | Local Ollama model integration |

## Project Setup

When using Agent Framework with AG-UI, do NOT scaffold with `dotnet new webapi` — it generates a REST template (`MapGet("/weatherforecast")`) that conflicts with the agent pattern. Instead, use `dotnet new web` (empty ASP.NET Core app) and write `Program.cs` from scratch following the patterns below.

## Basic AG-UI Server (Getting Started)

From Step01_GettingStarted — the minimal AG-UI server:

```csharp
using Azure.AI.OpenAI;
using Azure.Identity;
using Microsoft.Agents.AI;
using Microsoft.Agents.AI.Hosting.AGUI.AspNetCore;
using OpenAI.Chat;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);
builder.Services.AddHttpClient().AddLogging();
builder.Services.AddAGUI();

WebApplication app = builder.Build();

string endpoint = builder.Configuration["AZURE_OPENAI_ENDPOINT"]
    ?? throw new InvalidOperationException("AZURE_OPENAI_ENDPOINT is not set.");
string deploymentName = builder.Configuration["AZURE_OPENAI_DEPLOYMENT_NAME"]
    ?? throw new InvalidOperationException("AZURE_OPENAI_DEPLOYMENT_NAME is not set.");

ChatClient chatClient = new AzureOpenAIClient(
        new Uri(endpoint),
        new DefaultAzureCredential())
    .GetChatClient(deploymentName);

AIAgent agent = chatClient.AsAIAgent(
    name: "AGUIAssistant",
    instructions: "You are a helpful assistant.");

// Map the AG-UI endpoint — uses SSE streaming over HTTP POST
app.MapAGUI("/", agent);

await app.RunAsync();
```

Key setup pattern:
1. `builder.Services.AddAGUI()` — registers AG-UI services
2. `chatClient.AsAIAgent(name, instructions)` — creates an `AIAgent` from any `ChatClient`
3. `app.MapAGUI("/", agent)` — exposes the agent as an AG-UI HTTP endpoint (NOT `MapAgent`)

`MapAGUI` maps the agent directly as an HTTP API endpoint (SSE over POST). The agent itself handles all chat interactions, tool calls, and streaming — there is no need to create separate API controllers or service classes for functionality the agent already provides.

## AG-UI Server with Backend Tools

From Step02_BackendTools — tools that execute on the server:

```csharp
using System.ComponentModel;
using System.Text.Json.Serialization;
using Azure.AI.OpenAI;
using Azure.Identity;
using Microsoft.Agents.AI;
using Microsoft.Agents.AI.Hosting.AGUI.AspNetCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Options;
using OpenAI.Chat;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);
builder.Services.AddHttpClient().AddLogging();
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.TypeInfoResolverChain.Add(SampleJsonSerializerContext.Default));
builder.Services.AddAGUI();

WebApplication app = builder.Build();

// Define function tools using [Description] and typed parameters
[Description("Search for restaurants in a location.")]
static RestaurantSearchResponse SearchRestaurants(
    [Description("The restaurant search request")] RestaurantSearchRequest request)
{
    return new RestaurantSearchResponse
    {
        Location = request.Location,
        Results = [
            new RestaurantInfo { Name = "The Golden Fork", Rating = 4.5, Address = $"123 Main St, {request.Location}" }
        ]
    };
}

// Get JsonSerializerOptions from configured HTTP JSON options
var jsonOptions = app.Services.GetRequiredService<IOptions<Microsoft.AspNetCore.Http.Json.JsonOptions>>().Value;

// Create tools with serializer options for source generation
AITool[] tools = [
    AIFunctionFactory.Create(SearchRestaurants, serializerOptions: jsonOptions.SerializerOptions)
];

ChatClient chatClient = new AzureOpenAIClient(
        new Uri(endpoint), new DefaultAzureCredential())
    .GetChatClient(deploymentName);

// AsAIAgent returns ChatClientAgent when tools are provided
ChatClientAgent agent = chatClient.AsAIAgent(
    name: "AGUIAssistant",
    instructions: "You are a helpful assistant with access to restaurant information.",
    tools: tools);

app.MapAGUI("/", agent);
await app.RunAsync();

// Define request/response types
internal sealed class RestaurantSearchRequest
{
    public string Location { get; set; } = string.Empty;
    public string Cuisine { get; set; } = "any";
}

internal sealed class RestaurantSearchResponse
{
    public string Location { get; set; } = string.Empty;
    public RestaurantInfo[] Results { get; set; } = [];
}

internal sealed class RestaurantInfo
{
    public string Name { get; set; } = string.Empty;
    public double Rating { get; set; }
    public string Address { get; set; } = string.Empty;
}

// JSON serialization context for AOT/source generation
[JsonSerializable(typeof(RestaurantSearchRequest))]
[JsonSerializable(typeof(RestaurantSearchResponse))]
internal sealed partial class SampleJsonSerializerContext : JsonSerializerContext;
```

## AG-UI Client (Connecting to an AG-UI Server)

From Step01_GettingStarted/Client — .NET console client using `AGUIChatClient`:

```csharp
using Microsoft.Agents.AI;
using Microsoft.Agents.AI.AGUI;
using Microsoft.Extensions.AI;

string serverUrl = Environment.GetEnvironmentVariable("AGUI_SERVER_URL") ?? "http://localhost:8888";

using HttpClient httpClient = new() { Timeout = TimeSpan.FromSeconds(60) };

// AGUIChatClient wraps an AG-UI server endpoint as an IChatClient
AGUIChatClient chatClient = new(httpClient, serverUrl);

AIAgent agent = chatClient.AsAIAgent(
    name: "agui-client",
    description: "AG-UI Client Agent");

AgentSession session = await agent.CreateSessionAsync();
List<ChatMessage> messages = [new(ChatRole.System, "You are a helpful assistant.")];

messages.Add(new ChatMessage(ChatRole.User, "Hello!"));

// Stream the response
await foreach (AgentResponseUpdate update in agent.RunStreamingAsync(messages, session))
{
    foreach (AIContent content in update.Contents)
    {
        if (content is TextContent textContent)
            Console.Write(textContent.Text);
        else if (content is ErrorContent errorContent)
            Console.WriteLine($"[Error: {errorContent.Message}]");
    }
}
```

## DelegatingAIAgent Middleware Pattern

From Step04_HumanInLoop and Step05_StateManagement — extend agents with middleware:

```csharp
using System.Runtime.CompilerServices;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;

// Extend DelegatingAIAgent to wrap an inner agent with custom behavior
internal sealed class MyMiddlewareAgent : DelegatingAIAgent
{
    public MyMiddlewareAgent(AIAgent innerAgent) : base(innerAgent) { }

    protected override Task<AgentResponse> RunCoreAsync(
        IEnumerable<ChatMessage> messages,
        AgentSession? session = null,
        AgentRunOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        return RunCoreStreamingAsync(messages, session, options, cancellationToken)
            .ToAgentResponseAsync(cancellationToken);
    }

    protected override async IAsyncEnumerable<AgentResponseUpdate> RunCoreStreamingAsync(
        IEnumerable<ChatMessage> messages,
        AgentSession? session = null,
        AgentRunOptions? options = null,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        // Pre-processing: modify messages, add system prompts, etc.

        // Delegate to inner agent
        await foreach (var update in InnerAgent.RunStreamingAsync(
            messages, session, options, cancellationToken).ConfigureAwait(false))
        {
            // Post-processing: transform updates, emit state, etc.
            yield return update;
        }
    }
}

// Usage: wrap the base agent
AIAgent baseAgent = chatClient.AsAIAgent(name: "MyAgent", instructions: "...");
AIAgent agent = new MyMiddlewareAgent(baseAgent);
app.MapAGUI("/", agent);
```

## State Management with AG-UI

From Step05_StateManagement — emit structured state updates as `DataContent`:

```csharp
// Define state models with JSON serialization
internal sealed class AgentState
{
    [JsonPropertyName("recipe")]
    public RecipeState Recipe { get; set; } = new();
}

internal sealed class RecipeState
{
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;
    [JsonPropertyName("ingredients")]
    public List<string> Ingredients { get; set; } = [];
    [JsonPropertyName("steps")]
    public List<string> Steps { get; set; } = [];
}

[JsonSerializable(typeof(AgentState))]
[JsonSerializable(typeof(JsonElement))]
internal sealed partial class RecipeSerializerContext : JsonSerializerContext;

// In DelegatingAIAgent, emit state as DataContent:
byte[] stateBytes = JsonSerializer.SerializeToUtf8Bytes(stateSnapshot, jsonOptions.GetTypeInfo(typeof(JsonElement)));
yield return new AgentResponseUpdate
{
    Contents = [new DataContent(stateBytes, "application/json")]
};
```

## Human-in-the-Loop Approval

From Step04_HumanInLoop — wrap tools with approval requirements:

```csharp
#pragma warning disable MEAI001
AITool[] tools = [new ApprovalRequiredAIFunction(AIFunctionFactory.Create(ApproveExpenseReport))];
#pragma warning restore MEAI001

ChatClientAgent baseAgent = chatClient.AsAIAgent(
    name: "AGUIAssistant",
    instructions: "You are a helpful assistant in charge of approving expenses",
    tools: tools);

// Wrap with approval middleware (transforms ToolApprovalRequestContent ↔ request_approval tool calls)
var agent = new ServerFunctionApprovalAgent(baseAgent, jsonOptions.SerializerOptions);
app.MapAGUI("/", agent);
```

## Connecting to Ollama (Local LLM)

```csharp
using OllamaSharp;

var ollama = new OllamaApiClient("http://localhost:11434");
ollama.SelectedModel = "qwen2.5:latest";
IChatClient chatClient = ollama.AsChatClient();

AIAgent agent = chatClient.AsAIAgent(
    name: "LocalAgent",
    instructions: "You are helpful",
    tools: [AIFunctionFactory.Create(MyTool)]);
```

## csproj Setup

Server (AG-UI hosting):
```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFrameworks>net10.0</TargetFrameworks>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.Agents.AI.Hosting.AGUI.AspNetCore" />
    <PackageReference Include="Microsoft.Agents.AI.OpenAI" />
    <PackageReference Include="Azure.AI.OpenAI" />
    <PackageReference Include="Azure.Identity" />
  </ItemGroup>
</Project>
```

Client (AG-UI consumer):
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFrameworks>net10.0</TargetFrameworks>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.Agents.AI" />
    <PackageReference Include="Microsoft.Agents.AI.AGUI" />
  </ItemGroup>
</Project>
```

## AG-UI Protocol (How It Works)

1. Client sends HTTP POST with messages to the server
2. `MapAGUI` receives the request and invokes the agent
3. Agent processes messages via the Agent Framework
4. Responses stream back as **Server-Sent Events (SSE)**
5. `ConversationId` maintains conversation context across requests
6. `ResponseId` tracks individual execution runs

## Key Patterns Summary

- Use `builder.Services.AddAGUI()` + `app.MapAGUI("/", agent)` for hosting — NOT `MapAgent` or custom controllers
- Use `chatClient.AsAIAgent(name, instructions, tools)` to create agents from any `ChatClient`
- Use `AIFunctionFactory.Create()` with `[Description]` for tools — NOT manual function schemas
- Use `AGUIChatClient` to consume AG-UI servers from .NET — NOT manual HTTP/SSE parsing
- Use `DelegatingAIAgent` for middleware — override `RunCoreStreamingAsync` to intercept/transform
- Use `ConfigureHttpJsonOptions` + `JsonSerializerContext` for JSON source generation
- Use `DataContent` with `"application/json"` to emit structured state updates
- Use `AgentSession` + `CreateSessionAsync()` for conversation session management
- Target `net10.0` in csproj — NOT net6/7/8/9
