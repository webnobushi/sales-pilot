import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";

// メモリの設定
const memory = new Memory({
  storage: new LibSQLStore({
    url: "file:./memory.db",
  }),
  options: {
    semanticRecall: false, // semantic recall を無効化
    workingMemory: { enabled: true },
  },
});

const agentConfig = {
  name: "DefaultAgent",
  model: openai('gpt-4o-mini'),
  defaultGenerateOptions: {
    temperature: 0,
  },
  instructions: `あなたは営業管理の専門家です。ユーザーのさまざまな問いにその知識を踏まえて答えてください。`,
  memory,
};

export const defaultAgent = new Agent(agentConfig as any);