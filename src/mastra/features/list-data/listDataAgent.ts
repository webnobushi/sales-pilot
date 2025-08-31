import { openai } from "@ai-sdk/openai";
import { Agent, AgentConfig } from "@mastra/core/agent";
import { listDataMemory } from "@/mastra/features/list-data/listMemory";

const agentConfig: AgentConfig = {
  name: "ListDataAgent",
  model: openai('gpt-4o-mini'),
  defaultGenerateOptions: {
    temperature: 0,
  },
  instructions: `あなたは営業リストデータ担当です。
  ユーザからの問い合わせに対して、リストデータを取得してください。
  このエージェントはまだ作成できていないので、適当にリストを返却してください。
  `,
  memory: listDataMemory,
};

export const listDataAgent = new Agent(agentConfig);