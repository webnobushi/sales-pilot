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
      actionHandler: async ({ emit }) => {
        try {
          emit("sendMessage", {
            text: '計画ワークフローを実行してください',
            // ワークフローを実行
            metadata: { workflow: { name: 'planWorkflow' } }
          });
          return true;
        } catch (error) {
          console.error('plan action error:', error);
          return false;
        }
      },
      canExecute: (context: ContextMemory) => {
        return !!context.currentInfoList && context.currentContext === "plan" &&
          context.planData.status === "none" &&
          context.currentInfoList.length === planActionDefinition.requiredInfoList.length &&
          context.currentInfoList.every(info => info.value !== "")
      },
    },
    {
      id: "execution",
      type: "button" as const,
      label: "営業計画を適用",
      actionHandler: async ({ emit }) => {
        try {
          emit("sendMessage", {
            text: '計画に従って処理を実行してください',
            metadata: { workflow: { name: 'applyPlanWorkflow' } }
          });
          return true;
        } catch (error) {
          console.error('plan action error:', error);
          return false;
        }
      },
      canExecute: (context: ContextMemory) => {
        return context.currentContext === "plan" &&
          context.planData.status === "planned"
      },
    },
    {
      id: "reset",
      type: "button" as const,
      label: "営業計画を中止",
      actionHandler: async ({ emit }) => {
        emit("sendMessage", {
          text: '営業計画を中止します',
          metadata: { workflow: { name: 'resetContextWorkflow' } }
        });
        return true;
      },
      withUpdateMemoryOnComplete: true,
      canExecute: (context: ContextMemory) => {
        return context.currentContext === "plan" &&
          context.planData.status !== "completed"
      },
    },

  ],
  immediateExecution: false
};

export const generatePlanInstructions = () => {
  return `
あなたは営業プランニング担当です。

## 役割
ユーザからの営業計画に関する問い合わせに対して具体的なプランニングを行ってください。
ワーキングメモリのcurrentInfoList（現在の情報リスト）をユーザに入力してもらい、計画の実行準備をすることがあなたの目的です。

## currentInfoList（現在の情報リスト）
- 既に収集済みの情報があれば記録
- 各項目にname、value（値）を設定
- 以下の計画に必要な情報リストを元に現在の情報を更新すること
  ${JSON.stringify(planActionDefinition.requiredInfoList, null, 2)}

## ワーキングメモリの更新ルール
currentInfoListのみ更新してください。それ以外の情報は手動で更新します。

## 重要な注意事項
1. **必ずワーキングメモリを更新する**: ユーザとの会話が終わる前に、updateWorkingMemoryツールを呼び出してください
2. **スキーマの厳守**: 定義されたスキーマに完全に準拠したJSON形式で更新してください
3. **具体的な内容**: 抽象的な表現ではなく、具体的で実行可能な内容を記録してください
4. **状態管理**: 計画の進行状況に応じて適切にstatusを更新してください
`;
};