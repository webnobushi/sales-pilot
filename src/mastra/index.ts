
import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { PinoLogger } from '@mastra/loggers';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { defaultAgent } from '@/mastra/agents/contextAgent';
import { frontMemory } from '@/mastra/features/front/frontMemory';
import { UIMessage } from 'ai';
import z from 'zod';

const defaultStorage = new LibSQLStore({
  url: `file:${join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.mastra', 'mastra.db')}`,
});

// HITL resume data schema
const metadataSchema = z.object({
  runId: z.string().optional(),
  workflowName: z.string().optional(),
});

// text以外のUIメッセージ カスタムデータスキーマ
const customDataSchema = z.object({
  componentName: z.string(),
});

// text以外のUIメッセージ カスタムデータスキーマ
const triggerWorkflowDataSchema = z.object({
  workflowName: z.string(),
});

// ワーキングメモリテスト用のスキーマ
const workingMemoryDebugSchema = z.object({
  workingMemory: z.any().optional(),
  timestamp: z.string(),
  threadId: z.string(),
  resourceId: z.string(),
  error: z.string().optional(),
  message: z.string().optional(),
  rawMemory: z.string().optional(),
});

const workflowSuggestionSchema = z.object({
  workflowOptions: z.array(z.object({
    id: z.string(),
    label: z.string(),
    description: z.string(),
    confidence: z.number(),
    requiredData: z.array(z.string()).optional()
  })),
  contextSummary: z.string().optional(),
  accumulatedData: z.record(z.string(), z.any()),
  missingData: z.array(z.string()),
  userIntent: z.string().optional(),
  suggestedAction: z.string().optional(),
});

export type CustomUIMessage = UIMessage<z.infer<typeof metadataSchema>, {
  'custom': z.infer<typeof customDataSchema>;
  'data-debug': z.infer<typeof workingMemoryDebugSchema>;
  'trigger-workflow': z.infer<typeof triggerWorkflowDataSchema>;
  'data-workflow-suggestion': z.infer<typeof workflowSuggestionSchema>;
}>;

export { frontMemory as defaultMemory };

export const mastra = new Mastra({
  agents: {
  },
  workflows: {
  },
  storage: defaultStorage,
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
