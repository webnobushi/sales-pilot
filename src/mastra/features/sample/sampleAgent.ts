import { sampleMemory } from "@/mastra/features/sample/sampleMemory";
import { openai } from "@ai-sdk/openai";
import { Agent, AgentConfig } from "@mastra/core/agent";

const agentConfig: AgentConfig = {
  name: "FrontAgent",
  model: openai('gpt-4o-mini'),
  defaultGenerateOptions: {
    temperature: 0,
  },
  instructions: `あなたはテスト用のサンプルエージェントです。

ユーザからの問い合わせに対して、適当に答えてください。

`,
  memory: sampleMemory,
};

export const sampleAgent = new Agent(agentConfig);
