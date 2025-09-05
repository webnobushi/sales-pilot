import { Memory } from '@mastra/memory';
import z from 'zod';
import { sharedStorage } from '@/mastra/core/storage';
import { contextMemorySchema } from '@/mastra/core/contextDefinitions';

export type ContextWorkingMemorySchema = z.infer<typeof contextMemorySchema>;

export const contextMemory = new Memory({
  storage: sharedStorage,
  options: {
    // lastMessages: 1,
    workingMemory: {
      enabled: true,
      schema: contextMemorySchema,
    },
  },
});
