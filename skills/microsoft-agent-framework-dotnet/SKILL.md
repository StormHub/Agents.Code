---
name: microsoft-agent-framework-dotnet
description: >-
  Expert guidance for building AI agents and multi-agent workflows using
  Microsoft Agent Framework for .NET (C#). Use this skill whenever the user
  mentions Agent Framework, AIAgent, ChatClientAgent, AgentWorkflowBuilder,
  Microsoft.Agents.AI, multi-agent orchestration in .NET, or is building
  agentic AI applications with C#. Also trigger when the user references
  Semantic Kernel or AutoGen migration, agent handoff patterns, agent
  middleware, agent tools/function calling in .NET, A2A protocol, MCP
  integration with .NET agents, or any of the Microsoft.Agents.* NuGet
  packages. Trigger even if the user just says "agent" in a .NET/C# context.
---

# Microsoft Agent Framework for .NET

Microsoft Agent Framework (v1.0, released April 2026) is the production-ready
successor to both Semantic Kernel and AutoGen. It unifies simple agent
abstractions with enterprise-grade features: session-based state management,
type safety, middleware pipelines, telemetry, and graph-based workflows — all
in idiomatic C#.

## Key NuGet Packages

| Package | Purpose |
|---------|---------|
| `Microsoft.Agents.AI` | Core abstractions: `AIAgent`, tools, middleware, memory |
| `Microsoft.Agents.AI.OpenAI` | OpenAI + Azure OpenAI connectors |
| `Microsoft.Agents.AI.Foundry` | Azure AI Foundry connector |
| `Microsoft.Agents.AI.Anthropic` | Anthropic Claude connector |
| `Microsoft.Agents.AI.Workflows` | Graph-based multi-agent workflows |
| `Microsoft.Agents.AI.Hosting.A2A.AspNetCore` | A2A protocol hosting |
| `Microsoft.Agents.AI.Hosting.OpenAI` | OpenAI-compatible HTTP endpoints |
| `Microsoft.Agents.AI.DurableTask` | Stateful long-running workflows |
| `Microsoft.Agents.AI.Purview` | Purview governance middleware |

**Minimum requirements:** .NET 9.0+, Visual Studio 2022 or VS Code with C# extension.

---

## 1. Creating Agents

### 1.1 Basic Agent (Azure OpenAI)

```csharp
using Azure.AI.OpenAI;
using Azure.Identity;
using Microsoft.Agents.AI;

AIAgent agent = new AzureOpenAIClient(
        new Uri(Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!),
        new AzureCliCredential())
    .GetChatClient("gpt-4o-mini")
    .AsAIAgent(
        instructions: "You are a friendly assistant.",
        name: "MyAgent");

Console.WriteLine(await agent.RunAsync("What is the capital of France?"));
```

### 1.2 Basic Agent (OpenAI Direct)

```csharp
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;
using OpenAI;

AIAgent agent = new OpenAIClient("your-api-key")
    .GetChatClient("gpt-4o-mini")
    .AsIChatClient()
    .CreateAIAgent(
        instructions: "You are a senior .NET architect.",
        name: "Architect");

var response = await agent.RunAsync("Design a retry policy for transient SQL failures.");
Console.WriteLine(response);
```

### 1.3 Basic Agent (Azure AI Foundry)

```csharp
using Azure.AI.Projects;
using Azure.Identity;
using Microsoft.Agents.AI;

AIAgent agent = new AIProjectClient(
        new Uri(Environment.GetEnvironmentVariable("AZURE_AI_PROJECT_ENDPOINT")!),
        new DefaultAzureCredential())
    .AsAIAgent(
        model: "gpt-4o-mini",
        instructions: "You are a friendly assistant. Keep your answers brief.",
        name: "HelloAgent");

Console.WriteLine(await agent.RunAsync("What is the largest city in France?"));
```

### 1.4 Basic Agent (Ollama — Local, Free)

```csharp
using Microsoft.Agents.AI;
using OllamaSharp;

AIAgent agent = new OllamaApiClient(
        new Uri("http://localhost:11434"), "llama3.2")
    .AsAIAgent(
        instructions: "You are a helpful assistant.",
        name: "LocalAgent");

Console.WriteLine(await agent.RunAsync("Explain dependency injection briefly."));
```

### 1.5 ChatClientAgent (Any IChatClient)

Any `Microsoft.Extensions.AI.IChatClient` implementation works:

```csharp
using Microsoft.Agents.AI;

var agent = new ChatClientAgent(chatClient, new ChatClientAgentOptions
{
    Name = "Writer",
    Instructions = "Write stories that are engaging and creative."
});
```

### 1.6 Key Extension Methods

- `.AsAIAgent(...)` — wraps a chat client into an `AIAgent` with instructions, tools, name
- `.AsIChatClient()` — bridges an OpenAI client to `IChatClient`
- `.AsBuilder()` — gets an agent builder for adding middleware, memory, etc.

---

## 2. Tools and Function Calling

Agent Framework auto-discovers, generates schemas for, and invokes tools.

### 2.1 Inline Function Tools

```csharp
using Microsoft.Agents.AI;

var tools = new[]
{
    AIFunctionFactory.Create(
        (string query) => $"Results for: {query}",
        "search_docs",
        "Search internal documentation")
};

AIAgent agent = chatClient.CreateAIAgent(
    instructions: "Use search_docs to answer questions from internal docs.",
    tools: tools);
```

### 2.2 Attributed Method Tools

```csharp
using System.ComponentModel;

[Description("Provides a random vacation destination.")]
static string GetRandomDestination()
{
    var destinations = new[] { "Paris", "Tokyo", "Sydney", "Rio de Janeiro" };
    return destinations[Random.Shared.Next(destinations.Length)];
}

[Description("Gets the current weather for a location.")]
static string GetWeather(string location) =>
    $"The weather in {location} is sunny, 25°C.";
```

Add tools via `ChatOptions`:

```csharp
var agent = new ChatClientAgent(chatClient, new ChatClientAgentOptions
{
    Name = "TravelAgent",
    Instructions = "Help users plan vacations using available tools.",
    ChatOptions = new ChatOptions
    {
        Tools = [
            AIFunctionFactory.Create(GetRandomDestination),
            AIFunctionFactory.Create(GetWeather)
        ]
    }
});
```

### 2.3 MCP Tool Integration

Agents resolve MCP tools at runtime from any MCP-compliant server. The
framework handles discovery and invocation automatically.

---

## 3. Multi-Turn Conversations (Sessions)

```csharp
var session = new AgentSession();

// First turn
var r1 = await agent.RunAsync("My name is Alice.", session);
Console.WriteLine(r1);

// Second turn — agent remembers context
var r2 = await agent.RunAsync("What's my name?", session);
Console.WriteLine(r2); // "Your name is Alice."
```

### 3.1 Streaming Responses

```csharp
await foreach (var chunk in agent.RunStreamingAsync("Tell me a story."))
{
    Console.Write(chunk.Text);
}
```

### 3.2 Structured Output

```csharp
var result = await agent.RunAsync<MyResponseType>("Analyze this data.");
// result is strongly-typed
```

---

## 4. Middleware Pipeline

Middleware intercepts and transforms agent behavior at every execution stage.

```csharp
AIAgent agent = chatClient
    .AsAIAgent(instructions: "You are a helpful assistant.")
    .AsBuilder()
    .WithMiddleware(async (context, next) =>
    {
        // Pre-processing: log, filter, transform input
        Console.WriteLine($"Input: {context.Input}");

        await next(context); // Call next in pipeline

        // Post-processing: log, filter, transform output
        Console.WriteLine($"Output: {context.Output}");
    })
    .Build();
```

### 4.1 Purview Governance Middleware

```csharp
using Microsoft.Agents.AI.Purview;

AIAgent agent = chatClient
    .AsAIAgent("You are a helpful assistant.")
    .AsBuilder()
    .WithPurview(credential, new PurviewSettings("My App"))
    .Build();
```

---

## 5. Multi-Agent Workflows

Install: `dotnet add package Microsoft.Agents.AI.Workflows --prerelease`

### 5.1 Sequential Workflow

Agents execute in order, each building on the previous output:

```csharp
using Microsoft.Agents.AI;

AIAgent writer = new ChatClientAgent(chatClient, new ChatClientAgentOptions
{
    Name = "Writer",
    Instructions = "Write stories that are engaging and creative."
});

AIAgent editor = new ChatClientAgent(chatClient, new ChatClientAgentOptions
{
    Name = "Editor",
    Instructions = "Make the story more engaging, fix grammar, and enhance the plot."
});

Workflow workflow = AgentWorkflowBuilder.BuildSequential(writer, editor);
AIAgent workflowAgent = await workflow.AsAgentAsync();

var response = await workflowAgent.RunAsync("Write a short story about a haunted house.");
Console.WriteLine(response.Text);
```

### 5.2 Handoff Workflow

One agent transfers full control to the next:

```csharp
var workflow = AgentWorkflowBuilder
    .CreateHandoffBuilderWith(triageAgent)
    .WithHandoffs(triageAgent, [receptionistAgent, technicalAgent, summaryAgent])
    .WithHandoffs(receptionistAgent, [technicalAgent, triageAgent])
    .WithHandoffs(technicalAgent, [summaryAgent, triageAgent])
    .WithHandoff(summaryAgent, triageAgent)
    .Build();
```

### 5.3 Group Chat (Round-Robin)

```csharp
Workflow workflow = AgentWorkflowBuilder
    .CreateGroupChatBuilderWith(agents =>
        new AgentWorkflowBuilder.RoundRobinGroupChatManager(agents)
        {
            MaximumIterationCount = 3
        })
    .AddParticipants(writer, editor)
    .Build();

AIAgent workflowAgent = await workflow.AsAgentAsync();
var response = await workflowAgent.RunAsync("Write and refine a poem about the ocean.");
```

### 5.4 Concurrent Execution

Run multiple agents in parallel and aggregate results.

### 5.5 Conditional/Branching

Route to different agents based on input analysis.

**Pattern Summary:**

| Pattern | Use Case |
|---------|----------|
| Sequential | Pipeline: write → edit → publish |
| Concurrent | Fan-out: research multiple topics simultaneously |
| Handoff | Transfer control: triage → specialist → summary |
| Group Chat | Collaborative: debate, review, brainstorm |
| Conditional | Routing: classify then dispatch |

---

## 6. Hosting and Deployment

### 6.1 ASP.NET Core Minimal API

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddKeyedSingleton<AIAgent>("Writer", (sp, _) =>
    chatClient.AsAIAgent(instructions: "Write creatively.", name: "Writer"));

builder.Services.AddKeyedSingleton<AIAgent>("Editor", (sp, _) =>
    chatClient.AsAIAgent(instructions: "Edit and improve text.", name: "Editor"));

var app = builder.Build();

app.MapGet("/agent/chat", async (
    [FromKeyedServices("Writer")] AIAgent writer,
    [FromKeyedServices("Editor")] AIAgent editor,
    string prompt) =>
{
    var workflow = AgentWorkflowBuilder.BuildSequential(writer, editor);
    var workflowAgent = await workflow.AsAgentAsync();
    var response = await workflowAgent.RunAsync(prompt);
    return Results.Ok(response);
});

app.Run();
```

### 6.2 Deployment Targets

| Target | Package |
|--------|---------|
| ASP.NET Core | `Microsoft.Agents.AI.Hosting.OpenAI` or `.A2A.AspNetCore` |
| Azure Functions | `Microsoft.Agents.AI.DurableTask` (isolated worker) |
| Console / CLI | Direct — no hosting package needed |
| Windows Service / Linux Daemon | `Microsoft.Agents.AI.Hosting` + `UseWindowsService()` |
| Docker / Aspire | Standard containerization with Aspire integration |

---

## 7. Declarative Agents (YAML)

Define agents and workflows in version-controlled YAML files and load them
with a single API call.

---

## 8. Protocols and Interop

- **MCP (Model Context Protocol):** Agents dynamically discover and invoke
  tools from MCP-compliant servers at runtime.
- **A2A (Agent-to-Agent):** Cross-runtime agent collaboration via structured,
  protocol-driven messaging. Agents in different frameworks can coordinate.

---

## 9. Provider Connectors

All connectors implement `IChatClient` from `Microsoft.Extensions.AI`.
Swapping providers is a one-line change.

| Provider | Package |
|----------|---------|
| Azure OpenAI | `Azure.AI.OpenAI` |
| OpenAI | `OpenAI` |
| Azure AI Foundry | `Azure.AI.Projects` + `Microsoft.Agents.AI.Foundry` |
| Anthropic Claude | `Microsoft.Agents.AI.Anthropic` |
| Amazon Bedrock | `Microsoft.Agents.AI.Bedrock` |
| Google Gemini | `Microsoft.Agents.AI.Gemini` |
| Ollama | `OllamaSharp` |

---

## 10. Memory and Context Providers

Pluggable memory architecture:
- **Conversation history** — managed per-session or via service-side storage
- **Key-value state** — persistent state across sessions
- **Vector retrieval** — similarity search for RAG patterns

---

## 11. Common Patterns and Best Practices

### Project Setup

```bash
dotnet new console -o MyAgentApp
cd MyAgentApp
dotnet add package Microsoft.Agents.AI
dotnet add package Microsoft.Agents.AI.OpenAI    # or provider of choice
dotnet add package Azure.Identity                 # if using Azure
```

### Environment Variables

```bash
# Azure OpenAI
export AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"
export AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o-mini"

# OpenAI Direct
export OPENAI_API_KEY="sk-..."

# Azure AI Foundry
export AZURE_AI_PROJECT_ENDPOINT="https://..."

# GitHub Models
export GH_TOKEN="your-github-token"
export GH_ENDPOINT="https://models.github.ai/inference"
export GH_MODEL_ID="openai/gpt-4o-mini"
```

### Authentication Guidance

- **Development:** `AzureCliCredential` or `DefaultAzureCredential` is fine
- **Production:** Use specific credentials like `ManagedIdentityCredential`
  to avoid latency and unintended credential probing
- **API Keys:** Use `ApiKeyCredential` for OpenAI direct or GitHub Models

### When to Use Agents vs Workflows vs Plain Code

| Scenario | Approach |
|----------|----------|
| Open-ended conversation | Single agent |
| Well-defined multi-step process | Workflow |
| Multiple agents coordinating | Multi-agent workflow |
| Deterministic logic, no LLM needed | Plain C# — skip agents entirely |

> **Rule of thumb:** If you can write a function to handle the task, do that
> instead of using an AI agent.

---

## 12. Migration from Semantic Kernel / AutoGen

Agent Framework is the direct successor to both. Key differences:

- **Semantic Kernel → Agent Framework:** Gains multi-agent orchestration,
  graph workflows, simplified agent creation. Enterprise features (DI,
  middleware, telemetry) carry forward.
- **AutoGen → Agent Framework:** Gains type safety, enterprise middleware,
  production hosting. Multi-agent patterns carry forward.

See the official migration guides on Microsoft Learn for detailed steps.

---

## 13. Telemetry and Observability

Agent Framework includes built-in OpenTelemetry integration for tracing agent
execution, tool calls, and workflow steps. Use with Aspire dashboard or any
OpenTelemetry-compatible backend.

---

## Quick Reference: Common API Surface

```
AIAgent                          — Base agent type
ChatClientAgent                  — Agent wrapping any IChatClient
AgentSession                     — Conversation state container
AgentWorkflowBuilder             — Fluent workflow construction
  .BuildSequential(...)          — Sequential pipeline
  .CreateHandoffBuilderWith(...) — Handoff pattern
  .CreateGroupChatBuilderWith(...)— Group chat pattern
AIFunctionFactory.Create(...)    — Register function tools
agent.RunAsync(prompt)           — Single-turn execution
agent.RunAsync<T>(prompt)        — Structured output
agent.RunStreamingAsync(prompt)  — Streaming execution
agent.AsBuilder()                — Get builder for middleware/memory
workflow.AsAgentAsync()          — Convert workflow to agent
```
