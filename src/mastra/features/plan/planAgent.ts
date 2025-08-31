import { openai } from "@ai-sdk/openai";
import { Agent, AgentConfig } from "@mastra/core/agent";
import { planMemory } from "@/mastra/features/plan/plaMemory";

const agentConfig: AgentConfig = {
  name: "PlanAgent",
  model: openai('gpt-4o-mini'),
  defaultGenerateOptions: {
    temperature: 0,
  },
  instructions: `あなたは営業プランニング担当です。
  ユーザからの問い合わせに対して、プランニングを行ってください。
  分析結果はワーキングメモリに保存してください。
  `,
  memory: planMemory,
};

export const planAgent = new Agent(agentConfig);
