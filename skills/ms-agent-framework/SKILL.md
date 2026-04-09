---
name: ms-agent-framework
description: Microsoft Agent Framework (.NET) patterns for building AI agents with AG-UI protocol, tools, middleware, and ASP.NET Core hosting. Use when the spec references Agent Framework, AG-UI, or Microsoft.Agents packages.
---

# Microsoft Agent Framework (.NET)

Documentation: https://learn.microsoft.com/en-us/agent-framework/overview/?pivots=programming-language-csharp

## NuGet Packages

| Package | Purpose |
|---------|---------|
| `Microsoft.Agents.AI` | Core agent framework (AIAgent, AIAgentBuilder) |
| `Microsoft.Agents.AI.Hosting.AspNetCore` | AG-UI protocol hosting via ASP.NET Core |
| `Microsoft.Extensions.AI` | IChatClient abstraction layer |
| `OllamaSharp` | Connect to local Ollama models |
| `Azure.AI.OpenAI` | Azure OpenAI provider |

## Creating an Agent with Tools

```csharp
using Microsoft.Extensions.AI;

// Create agent from any IChatClient (Azure OpenAI, Ollama, etc.)
AIAgent agent = chatClient.AsAIAgent(
    name: "MyAgent",
    instructions: "You are a helpful assistant",
    tools: [AIFunctionFactory.Create(MyToolMethod)]
);

// Run the agent
string response = await agent.RunAsync("Hello!");
```

## Defining Tools

Use `[Description]` attributes and `AIFunctionFactory.Create()`:

```csharp
[Description("Get weather for a location")]
static string GetWeather([Description("City name")] string location)
    => JsonSerializer.Serialize(new WeatherResult {
        Location = location,
        TemperatureC = 22,
        Condition = "sunny"
    });

// Register in agent
var agent = chatClient.AsAIAgent(
    tools: [AIFunctionFactory.Create(GetWeather)]
);
```

## Hosting with ASP.NET Core (AG-UI Protocol)

AG-UI (Agent User Interaction Protocol) streams agent events over HTTP:

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors();

var app = builder.Build();
app.UseCors(p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());

// Map agent as an AG-UI HTTP endpoint
app.MapAgent(agent);

app.Run();
```

## Connecting to Ollama (Local LLM)

```csharp
using OllamaSharp;

var ollama = new OllamaApiClient("http://localhost:11434");
ollama.SelectedModel = "qwen2.5:latest";
IChatClient chatClient = ollama.AsChatClient();

// Then create agent from this client
var agent = chatClient.AsAIAgent(
    name: "LocalAgent",
    instructions: "You are helpful",
    tools: [AIFunctionFactory.Create(MyTool)]
);
```

## Middleware Pipeline

```csharp
AIAgent agent = new AIAgentBuilder(innerAgent)
    .Use(async (messages, session, options, next, ct) => {
        // Pre-processing
        Console.WriteLine($"Processing {messages.Count()} messages");
        var result = await next(messages, session, options, ct);
        // Post-processing
        return result;
    })
    .WithLogging()
    .WithOpenTelemetry()
    .Build(services);
```

## Agent-as-Tool Composition

Wrap an agent as a tool for another agent:

```csharp
AIFunction agentAsFunction = childAgent.AsAIFunction(
    options: new AIFunctionFactoryOptions { Name = "specialist_agent" },
    session: sessionInstance
);

var orchestrator = chatClient.AsAIAgent(
    tools: [agentAsFunction, AIFunctionFactory.Create(OtherTool)]
);
```

## Frontend Integration (AG-UI with Vercel AI SDK)

The AG-UI endpoint is consumed by the Vercel AI SDK on the frontend:

```typescript
import { useAgui } from "@anthropic-ai/agent-ui";

// Connect to the AG-UI backend endpoint
const { messages, input, handleSubmit } = useAgui({
  url: "http://localhost:5000/api/agent",
});
```

## Key Patterns Summary

- Use `chatClient.AsAIAgent()` to create agents — NOT manual HTTP/REST calls to LLM APIs
- Use `AIFunctionFactory.Create()` for tools — NOT manual function schemas
- Use `app.MapAgent()` for hosting — NOT custom controller endpoints
- Use `IChatClient` abstraction — swap providers without code changes
- Use `AIAgentBuilder` for middleware — NOT manual decorator patterns
