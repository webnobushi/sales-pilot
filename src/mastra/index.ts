
import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { PinoLogger } from '@mastra/loggers';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { contextMemory } from '@/mastra/core/contextMemory';
import { UIMessage } from 'ai';
import z from 'zod';
import { commonWorkingMemorySchema } from '@/mastra/core/contextDefinitions';
import { frontAgent } from '@/mastra/features/front/frontAgent';

const defaultStorage = new LibSQLStore({
  url: `file:${join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.mastra', 'mastra.db')}`,
});

const metadataSchema = z.object({
  currentContext: commonWorkingMemorySchema.shape.currentContext,
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
  },
  storage: defaultStorage,
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
