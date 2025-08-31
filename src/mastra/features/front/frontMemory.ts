import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import z from 'zod';

const storage = new LibSQLStore({
  url: `file:${join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '.mastra', 'mastra.db')}`,
});

const defaultWorkingMemorySchema = z.object({
  agent: z.enum(['listDataAgent', 'planAgent', 'none']),
});

export const frontMemory = new Memory({
  storage: storage,
  options: {
    lastMessages: 1,
    workingMemory: {
      enabled: true,
      schema: defaultWorkingMemorySchema,
    },
  },
});
