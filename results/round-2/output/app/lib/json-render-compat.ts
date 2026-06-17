// Minimal json-render compatibility layer
// This provides the core concepts needed for component rendering

import { z } from "zod";

/**
 * Simple catalog definition system
 * Allows defining available components with Zod schemas
 */
export function defineCatalog(baseSchema: any, config: {
  components: Record<string, { props: z.ZodSchema; description: string }>;
  actions: Record<string, { description: string }>;
}) {
  return {
    components: config.components,
    actions: config.actions,
    prompt: () => {
      const componentsList = Object.entries(config.components)
        .map(([name, comp]) => `- ${name}: ${comp.description}`)
        .join('\n');
      return `Available components for rendering:\n${componentsList}`;
    }
  };
}

/**
 * Registry that maps catalog components to React implementations
 */
export function defineRegistry(catalog: any, implementations: {
  components: Record<string, (props: any) => React.ReactElement>;
}) {
  return {
    registry: implementations.components,
    catalog
  };
}

/**
 * Base schema (placeholder)
 */
export const schema = {};
