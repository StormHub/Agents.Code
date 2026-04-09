---
name: json-render
description: json-render patterns for AI-generated UIs with guardrailed component catalogs. Covers defineCatalog, defineRegistry, Renderer, SpecStream streaming, and shadcn/ui integration. Use when the spec references json-render or AI-driven visual rendering of structured JSON.
---

# json-render — Generative UI Framework

Documentation: https://github.com/vercel-labs/json-render
Concept: AI generates a JSON spec → Renderer maps it to real UI components

## Packages

| Package | Purpose |
|---------|---------|
| `@json-render/core` | Schema, catalog, AI prompts, SpecStream utilities |
| `@json-render/react` | React Renderer component and hooks |
| `@json-render/shadcn` | 36 pre-built shadcn/ui component definitions + implementations |
| `@json-render/next` | Full Next.js app generation (routes, layouts, SSR) |

## Step 1: Define a Catalog (Component + Action Definitions)

The catalog tells the AI what components are available:

```typescript
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

const catalog = defineCatalog(schema, {
  components: {
    Card: {
      props: z.object({
        title: z.string(),
        subtitle: z.string().nullable(),
      }),
      description: "A card container with title",
    },
    Metric: {
      props: z.object({
        label: z.string(),
        value: z.string(),
        format: z.enum(["currency", "percent", "number"]).nullable(),
      }),
      description: "Display a metric value",
    },
    Button: {
      props: z.object({
        label: z.string(),
        variant: z.enum(["primary", "secondary"]).nullable(),
      }),
      description: "A clickable button",
    },
  },
  actions: {
    submit: { description: "Submit the form" },
    refresh: { description: "Refresh data" },
  },
});
```

## Step 2: Define a Registry (React Implementations)

Map each catalog component to a real React component:

```typescript
import { defineRegistry, Renderer } from "@json-render/react";

const { registry } = defineRegistry(catalog, {
  components: {
    Card: ({ props, children }) => (
      <div className="rounded-lg border p-4 shadow-sm">
        <h3 className="text-lg font-semibold">{props.title}</h3>
        {props.subtitle && <p className="text-muted-foreground">{props.subtitle}</p>}
        <div className="mt-2">{children}</div>
      </div>
    ),
    Metric: ({ props }) => (
      <div className="flex flex-col">
        <span className="text-sm text-muted-foreground">{props.label}</span>
        <span className="text-2xl font-bold">{props.value}</span>
      </div>
    ),
    Button: ({ props, emit }) => (
      <button
        className="rounded bg-primary px-4 py-2 text-white"
        onClick={() => emit("press")}
      >
        {props.label}
      </button>
    ),
  },
});
```

## Step 3: Render a Spec

The AI generates a flat spec (root + elements map), and `<Renderer>` displays it:

```typescript
// AI-generated spec
const spec = {
  root: "card-1",
  elements: {
    "card-1": {
      type: "Card",
      props: { title: "Weather in Tokyo", subtitle: "Current conditions" },
      children: ["temp-1", "humidity-1"],
    },
    "temp-1": {
      type: "Metric",
      props: { label: "Temperature", value: "22°C", format: "number" },
      children: [],
    },
    "humidity-1": {
      type: "Metric",
      props: { label: "Humidity", value: "65%", format: "percent" },
      children: [],
    },
  },
};

// Render it
function WeatherDisplay({ spec }) {
  return <Renderer spec={spec} registry={registry} />;
}
```

## Step 4: Generate AI System Prompt from Catalog

The catalog can generate a system prompt that tells the AI exactly what components are available:

```typescript
const systemPrompt = catalog.prompt();

// With custom rules
const systemPrompt = catalog.prompt({
  system: "You are a weather dashboard builder.",
  customRules: [
    "Always wrap content in a Card component",
    "Use Metric components for numerical values",
  ],
});
```

## Using Pre-Built shadcn/ui Components

Skip defining components from scratch — use the 36 pre-built shadcn/ui components:

```typescript
import { shadcnComponentDefinitions } from "@json-render/shadcn/catalog";
import { shadcnComponents } from "@json-render/shadcn";

const catalog = defineCatalog(schema, {
  components: {
    Card: shadcnComponentDefinitions.Card,
    Button: shadcnComponentDefinitions.Button,
    Stack: shadcnComponentDefinitions.Stack,
    Heading: shadcnComponentDefinitions.Heading,
    Badge: shadcnComponentDefinitions.Badge,
    // ... 30+ more available
  },
  actions: {},
});

const { registry } = defineRegistry(catalog, {
  components: {
    Card: shadcnComponents.Card,
    Button: shadcnComponents.Button,
    Stack: shadcnComponents.Stack,
    Heading: shadcnComponents.Heading,
    Badge: shadcnComponents.Badge,
  },
});
```

## SpecStream — Progressive Streaming

For real-time rendering as the AI generates the spec, use JSONL with JSON Patch operations:

```typescript
import { createSpecStreamCompiler } from "@json-render/core";

const compiler = createSpecStreamCompiler();

// As chunks arrive from the AI stream:
while (streaming) {
  const chunk = await reader.read();
  const { result, newPatches } = compiler.push(chunk);

  if (newPatches.length > 0) {
    setSpec(result); // UI updates progressively
  }
}

const finalSpec = compiler.getResult();
```

## Component renderProps

Each component receives these props:

```typescript
{
  props: object,           // Component props from the spec
  children: ReactNode,     // Rendered child elements
  emit: (action) => void,  // Emit actions to parent handler
  element: object,         // Full element definition from spec
}
```

## Key Patterns Summary

- Define a `catalog` with Zod schemas — this constrains what the AI can generate
- Define a `registry` that maps catalog entries to real React components
- Use `<Renderer spec={spec} registry={registry} />` to display AI output
- Use `catalog.prompt()` to generate the AI system prompt — NOT manual instructions
- Use `@json-render/shadcn` for pre-built components — NOT manual UI definitions
- Use SpecStream for progressive rendering — NOT waiting for the full response
