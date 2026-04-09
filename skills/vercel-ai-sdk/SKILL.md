---
name: vercel-ai-sdk
description: Vercel AI SDK patterns for building AI-powered Next.js applications. Covers useChat, streamText, generateText, structured output, tool calling, and streaming UI patterns. Use when the spec references Vercel AI SDK or @ai-sdk packages.
---

# Vercel AI SDK

Documentation: https://sdk.vercel.ai/docs
GitHub: https://github.com/vercel/ai

## Packages

| Package | Purpose |
|---------|---------|
| `ai` | Core: generateText, streamText, generateObject, streamObject |
| `@ai-sdk/react` | React hooks: useChat, useCompletion |
| `@ai-sdk/openai` | OpenAI provider |
| `@ai-sdk/anthropic` | Anthropic Claude provider |
| `@ai-sdk/google` | Google Generative AI provider |

## Next.js App Router — API Route (Server)

```typescript
// app/api/chat/route.ts
import { streamText, convertToModelMessages } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-5-mini'),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
```

## Next.js App Router — Chat UI (Client)

```typescript
// app/page.tsx
'use client';

import { useChat } from '@ai-sdk/react';

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, status } = useChat();

  return (
    <div>
      {messages.map(message => (
        <div key={message.id} className={message.role}>
          {message.parts.map((part, i) => {
            if (part.type === 'text') return <p key={i}>{part.text}</p>;
          })}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit" disabled={status === 'streaming'}>Send</button>
      </form>
    </div>
  );
}
```

## Text Generation (Server)

```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const { text } = await generateText({
  model: anthropic('claude-sonnet-4-20250514'),
  prompt: 'Explain quantum computing',
});
```

## Structured Output with Zod

```typescript
import { generateObject } from 'ai';
import { z } from 'zod';

const { object } = await generateObject({
  model: openai('gpt-5-mini'),
  schema: z.object({
    name: z.string(),
    ingredients: z.array(z.object({
      name: z.string(),
      amount: z.string(),
    })),
  }),
  prompt: 'Generate a lasagna recipe.',
});
```

## Streaming Text

```typescript
import { streamText } from 'ai';

const result = streamText({
  model: openai('gpt-5-mini'),
  messages: await convertToModelMessages(messages),
  onChunk: async ({ chunk }) => {
    // Handle each chunk
  },
});

return result.toUIMessageStreamResponse({
  originalMessages: messages,
  onFinish: ({ messages }) => {
    saveChat({ id, messages });
  },
});
```

## Tool Calling

```typescript
import { streamText, tool } from 'ai';
import { z } from 'zod';

const result = streamText({
  model: openai('gpt-5-mini'),
  messages,
  tools: {
    getWeather: tool({
      description: 'Get weather for a location',
      parameters: z.object({ location: z.string() }),
      execute: async ({ location }) => {
        return { temperature: 22, condition: 'sunny', location };
      },
    }),
  },
});
```

## AG-UI Protocol Connection

When connecting to a backend that uses AG-UI protocol (e.g., Microsoft Agent Framework):

```typescript
'use client';

import { useChat } from '@ai-sdk/react';

export default function AgentChat() {
  // Point useChat at the AG-UI endpoint
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: 'http://localhost:5000/api/agent', // AG-UI backend URL
  });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>{m.parts.map((p, i) =>
          p.type === 'text' ? <p key={i}>{p.text}</p> : null
        )}</div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
      </form>
    </div>
  );
}
```

## Key Patterns Summary

- Use `useChat` hook for chat UIs — NOT manual fetch/SSE
- Use `streamText` + `toUIMessageStreamResponse()` in API routes — NOT manual streaming
- Use `generateObject` with Zod schemas for structured output — NOT JSON.parse on text
- Use `tool()` helper for tool definitions — NOT manual function schemas
- Access message content via `message.parts` array — NOT `message.content` string
