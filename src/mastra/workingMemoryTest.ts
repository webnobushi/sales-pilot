import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import z from 'zod';

const workingMemoryStorage = new LibSQLStore({
  url: `file:${join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.mastra', 'working-memory-test.db')}`,
});

// ワーキングメモリのスキーマ
const workingMemorySchema = z.object({
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
  todoItems: z.array(z.object({
    description: z.string(),
    status: z.enum(["active", "completed"]).default("active"),
    due: z.string().optional(),
    started: z.string().optional(),
  })).optional(),
});

export const workingMemoryTestMemory = new Memory({
  storage: workingMemoryStorage,
  options: {
    lastMessages: 1,
    workingMemory: {
      enabled: true,
      schema: workingMemorySchema,
    },
  },
});
