import { openai } from "@ai-sdk/openai";
import { Agent, AgentConfig } from "@mastra/core/agent";
import { frontMemory } from "@/mastra/features/front/frontMemory";
import { workflowDefinitions } from "@/mastra/workflowDefinitions";

const agentConfig: AgentConfig = {
  name: "FrontAgent",
  model: openai('gpt-4o-mini'),
  defaultGenerateOptions: {
    temperature: 0,
  },
  instructions: `あなたは営業管理ツールの受付担当です。

ユーザからの問い合わせに対して、どのエージェントを呼び出すかを決めてワーキングメモリに保存してください。
具体的な回答はそれぞれの担当のエージェントに任せてください。

## 利用可能なエージェント
- listDataAgent: 営業リストデータの取得・表示に関する問い合わせ
- planAgent: 営業プランニング・戦略に関する問い合わせ

## 判断基準
- 営業リスト、顧客データ、データ取得、リスト表示などのキーワード → listDataAgent
- 営業計画、戦略、プランニング、売上向上などのキーワード → planAgent
- 上記に該当しない一般的な問い合わせ → none

## 注意事項 
- ワーキングメモリの更新は**必須**です
- ユーザーの入力に関係なく、常にワーキングメモリを更新してください
- スキーマに従った正確なJSON形式で更新してください
- 選択したエージェントに応じて適切な案内メッセージを返してください
`,
  memory: frontMemory,
};

export const frontAgent = new Agent(agentConfig);
