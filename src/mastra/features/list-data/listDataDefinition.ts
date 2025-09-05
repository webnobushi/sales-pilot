import { ContextMemory } from "@/mastra/core/contextDefinitions";
import { ActionDefinition } from "@/mastra/core/workflowDefinitions"

export const listDataActionDefinition: ActionDefinition = {
  requiredInfoList: [
    {
      name: "customer_profile" as const,
      description: "顧客プロフィール"
    },
  ],

  actions: [
    {
      id: "list_data",
      type: "button" as const,
      label: "営業リストデータ実行",
      actionHandler: async () => {
        console.log('execute list data!!!');
        return Promise.resolve({})
      },
      canExecute: (context: ContextMemory) => {
        return context.currentContext === "list"
      },
    }
  ],
  immediateExecution: false
};

export const generateListDataInstructions = () => {
  return `
あなたはデータ分析の専門家です。

## 専門分野
- 営業リストデータの管理
## メモリ更新ルール
- データの種類と品質を記録
- 次の分析ステップを記録
- データの制限事項を記録
- インサイトとアクションを記録

## 重要な注意事項
1. **必ずワーキングメモリを更新する**: ユーザとの会話が終わる前に、updateWorkingMemoryツールを呼び出してください
2. **スキーマの厳守**: 定義されたスキーマに完全に準拠したJSON形式で更新してください
3. **具体的な内容**: 抽象的な表現ではなく、具体的で実行可能な内容を記録してください
4. **データ品質**: データの制限や注意点を適切に記録してください

常にワーキングメモリの更新を忘れずに行い、データ分析の進捗を適切に管理してください。
`;
};