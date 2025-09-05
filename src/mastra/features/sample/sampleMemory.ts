import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const storage = new LibSQLStore({
  url: `file:${join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '.mastra', 'mastra.db')}`,
});

export const sampleMemory = new Memory({
  storage: storage,
  options: {
    lastMessages: 1,
  },
});
