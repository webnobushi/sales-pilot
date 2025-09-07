
import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { PinoLogger } from '@mastra/loggers';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { contextMemory } from '@/mastra/core/contextMemory';
import { UIMessage } from 'ai';
import z from 'zod';
import { commonWorkingMemorySchema, workflowNameEnum } from '@/mastra/core/contextDefinitions';
import { frontAgent } from '@/mastra/features/front/frontAgent';
import { planWorkflow } from '@/mastra/features/plan/planWorkflow';
import { applyPlanWorkflow } from '@/mastra/features/plan/applyPlanWorkflow';
import { resetContextWorkflow } from '@/mastra/features/reset/resetWorkflow';

const defaultStorage = new LibSQLStore({
  url: `file:${join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.mastra', 'mastra.db')}`,
});

const metadataSchema = z.object({
  currentContext: commonWorkingMemorySchema.shape.currentContext,
  workflow: z.object({
    name: workflowNameEnum.describe("ワークフローの名前"),
  }).optional(),
});

// text以外のUIメッセージ カスタムデータスキーマ
const customDataSchema = z.object({
  componentName: z.string(),
});

const statusSchema = z.object({
  status: z.string(),
});

export type CustomUIMessage = UIMessage<z.infer<typeof metadataSchema>, {
  'custom': z.infer<typeof customDataSchema>;
  'status': z.infer<typeof statusSchema>;
}>;

export { contextMemory as defaultMemory };

export const mastra = new Mastra({
  agents: {
    frontAgent,
  },
  workflows: {
    planWorkflow,
    resetContextWorkflow,
    applyPlanWorkflow,
  },
  storage: defaultStorage,
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
