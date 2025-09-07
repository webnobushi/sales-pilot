import { contextMemory } from "@/mastra/core/contextMemory";
import { openai } from "@ai-sdk/openai";
import { Agent, AgentConfig } from "@mastra/core/agent";

const agentConfig: AgentConfig = {
  name: "PlanAgent",
  model: openai('gpt-4o-mini'),
  defaultGenerateOptions: {
    temperature: 0,
  },
  instructions: `あなたは営業計画を実行するエージェントです。

# 役割
ワーキングメモリの情報を元に営業計画を実行してください。

# 営業計画の実行
currentInfoListの情報を必ず参照して、具体的な営業計画を作成してください。
ユーザからのフィードバックがある場合は、そのフィードバックを参考にして計画を修正してください。

# 出力形式
必ず以下の形式で終了してください：
「営業計画のワークフローを実行しました。

## 作成した計画
[収集した情報を具体的に活用した計画内容]

計画を行いました！！何か指摘があればお願いします。」

# ワーキングメモリの更新について
- 手動で更新するため一切更新しないでください
`,
  memory: contextMemory,
};

export const planAgent = new Agent(agentConfig);
