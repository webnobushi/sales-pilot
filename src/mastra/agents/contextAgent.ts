import { openai } from "@ai-sdk/openai";
import { Agent, AgentConfig } from "@mastra/core/agent";
import { frontMemory } from "@/mastra/features/front/frontMemory";
import { workflowDefinitions } from "@/mastra/workflowDefinitions";

// ワークフロー定義を動的に生成する関数
function generateWorkflowInstructions(): string {
  const workflowList = workflowDefinitions.map(wf => {
    const requiredFields = wf.requiredData.map(d => ({
      key: d.key,
      label: d.label,
      type: d.type,
      description: d.description,
      options: d.options
    }));

    const optionalFields = wf.optionalData?.map(d => ({
      key: d.key,
      label: d.label,
      type: d.type,
      description: d.description,
      options: d.options
    })) || [];

    const triggers = wf.triggers.map(t => ({
      keywords: t.keywords,
      intent: t.intent,
      confidence: t.confidence
    }));

    return {
      id: wf.id,
      name: wf.name,
      description: wf.description,
      category: wf.category,
      requiredData: requiredFields,
      optionalData: optionalFields,
      triggers: triggers,
    };
  });

  return JSON.stringify(workflowList, null, 2);
}

const instructions = `あなたは営業管理の専門家です。ユーザーのさまざまな問いにその知識を踏まえて答えてください。

## 重要: ワーキングメモリの更新
あなたは構造化されたワーキングメモリを持っています。**必ず**以下のJSONスキーマに従ってワーキングメモリを更新してください：
${generateWorkflowInstructions()}

## 応答方針
1. ユーザーの要望を理解し、適切な回答を提供してください
2. **必ず**ワーキングメモリのJSONスキーマに従って、会話の内容を構造化して保存してください
3. ワークフロー実行が適切な場合は、workflowOptionsに追加し、shouldTriggerWorkflowをtrueにしてください
4. 必要な情報が不足している場合は、missingDataに追加してください
5. 自然で親切な会話を心がけてください
6. ワークフローが即時実行可能であればワークフローを実行する旨を伝えてください

## 注意事項
- ワーキングメモリの更新は**必須**です
- ユーザーの入力に関係なく、常にワーキングメモリを更新してください
- スキーマに従った正確なJSON形式で更新してください`

const agentConfig: AgentConfig = {
  name: "DefaultAgent",
  model: openai('gpt-4o-mini'),
  defaultGenerateOptions: {
    temperature: 0,
  },
  instructions,
  memory: frontMemory,
};

export const defaultAgent = new Agent(agentConfig);

export const createDefaultAgent = (memory: any) => {
  return new Agent({
    ...agentConfig,
    memory,
  } as any);
};