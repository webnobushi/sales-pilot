import { ContextMemory } from "@/mastra/core/contextDefinitions";
import { ActionDefinition } from "@/mastra/core/workflowDefinitions";

export const planActionDefinition: ActionDefinition = {
  requiredInfoList: [
    {
      name: "business_target" as const,
      description: "営業先"
    },
    {
      name: "business_goal" as const,
      description: "営業目標"
    },
    {
      name: "method" as const,
      description: "営業方法"
    },
  ],

  actions: [
    {
      id: "plan",
      type: "button" as const,
      label: "計画実行",
      actionHandler: async () => {
        console.log('invoke plan!!!');
        return Promise.resolve(true)
      },
      canExecute: (context: ContextMemory) => {
        return !!context.currentInfoList && context.currentContext === "plan" &&
          context.currentInfoList.some(info => info.name === "business_target") &&
          context.currentInfoList.some(info => info.name === "business_goal")
      },
    },
    {
      id: "execution",
      type: "button" as const,
      label: "営業計画決定",
      actionHandler: async () => {
        console.log('apply plan!!!');
        return Promise.resolve(true)
      },
      canExecute: (context: ContextMemory) => {
        return context.currentContext === "plan" &&
          context.planData.status === "planned"
      },
    },
    {
      id: "reset",
      type: "button" as const,
      label: "会話を中止",
      actionHandler: async ({ threadId, resourceId }) => {
        const response = await fetch(`/api/chat/context?threadId=${threadId}&resourceId=${resourceId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          alert('会話を中止しました');
        } else {
          throw new Error('履歴の取得に失敗しました');
        }
        return true;
      },
      withUpdateMemoryOnComplete: true,
      canExecute: (context: ContextMemory) => {
        return context.currentContext === "plan"
      },
    },

  ],
  immediateExecution: false
};

export const generatePlanInstructions = () => {
  return `
あなたは営業プランニング担当です。

## 役割
ユーザからの営業計画に関する問い合わせに対して、体系的に分析し、具体的なプランニングを行ってください。

## ワーキングメモリの更新ルール
以下の情報のみ更新してください。それ以外の情報は手動で更新します。

### currentInfoList（現在の情報リスト）
- 既に収集済みの情報があれば記録
- 各項目にtype、value（値）、source、を設定
- 以下の計画に必要な情報リストを元に現在の情報を更新すること
  ${JSON.stringify(planActionDefinition.requiredInfoList, null, 2)}

### availableActions（利用可能なアクション）
- 現在の状況で実行可能なアクションをリストアップ
- 具体的な設定内容の定義
  ${JSON.stringify(planActionDefinition.actions, null, 2)}

## 重要な注意事項
1. **必ずワーキングメモリを更新する**: ユーザとの会話が終わる前に、updateWorkingMemoryツールを呼び出してください
2. **スキーマの厳守**: 定義されたスキーマに完全に準拠したJSON形式で更新してください
3. **具体的な内容**: 抽象的な表現ではなく、具体的で実行可能な内容を記録してください
4. **状態管理**: 計画の進行状況に応じて適切にstatusを更新してください
`;
};