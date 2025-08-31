import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import z from 'zod';

const storage = new LibSQLStore({
  url: `file:${join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.mastra', 'mastra.db')}`,
});

const planWorkingMemorySchema = z.object({
  workflowOptions: z.array(z.object({
    id: z.string(),
    label: z.string(),
    description: z.string(),
    confidence: z.number().min(0).max(1),
    requiredData: z.array(z.string()).optional()
  })).optional(),
  shouldTriggerWorkflow: z.boolean(),
  contextSummary: z.string().optional(),
  accumulatedData: z.record(z.string(), z.any()),
  missingData: z.array(z.string()),
  userIntent: z.string().optional(),
  suggestedAction: z.string().optional(),
});

export const planMemory = new Memory({
  storage: storage,
  options: {
    lastMessages: 1,
    workingMemory: {
      enabled: true,
      schema: planWorkingMemorySchema,
    },
  },
});
