import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import z from 'zod';

const storage = new LibSQLStore({
  url: `file:${join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '.mastra', 'mastra.db')}`,
});

const listDataWorkingMemorySchema = z.object({
  
});

export const listDataMemory = new Memory({
  storage: storage,
  options: {
    lastMessages: 1,
    workingMemory: {
      enabled: false,
      schema: listDataWorkingMemorySchema,
    },
  },
});
