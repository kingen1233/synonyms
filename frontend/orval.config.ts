import { defineConfig } from 'orval';

/**
 * Generates a typed API client + React Query hooks from the backend's OpenAPI spec.
 * The spec is produced automatically by `dotnet build` (Microsoft.Extensions.ApiDescription.Server),
 * so this only ever consumes it — there is no manual export step.
 */
export default defineConfig({
  synonyms: {
    input: '../backend/src/SynonymsTool.Api/swagger.json',
    output: {
      mode: 'tags-split',
      target: 'src/api/generated',
      schemas: 'src/api/generated/model',
      client: 'react-query',
      clean: true,
      prettier: true,
      override: {
        // Route every request through our axios instance (sets baseURL from env).
        mutator: {
          path: 'src/api/mutator.ts',
          name: 'apiClient',
        },
      },
    },
  },
});
