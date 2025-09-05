import { ContextMemory } from "@/mastra/core/contextDefinitions";
import { ActionDefinition } from "@/mastra/core/workflowDefinitions";

export const generateFrontInstructions = () => {
  return `あなたは営業管理ツールの受付担当です。

## 役割
ユーザからの問い合わせに対して、どの文脈の話をしているかを判別してワーキングメモリに保存してください。
文脈が切り替わった場合は切り替わったことだけを回答してください。

## ワーキングメモリの更新ルール
currentContextとuserIntentのみを更新してください。
それ以外の項目は別の文脈で利用するデータなので更新しないでください。

## 利用可能な文脈
- front: 一般的な問い合わせ（自身の担当）
- plan: 営業プランニング・戦略に関する問い合わせ
- listData: 営業リストデータの取得・表示に関する問い合わせ
`;
};

export const frontActionDefinition: ActionDefinition = {
  requiredInfoList: [],
  actions: [
    {
      id: "plan",
      type: "button" as const,
      label: "営業に関する相談",
      actionHandler: async () => {
        console.log('invoke plan!!!');
        // todo 必要な情報を引数で受け取れるようにしてメッセージを送信する
        return Promise.resolve({})
      },
      canExecute: (context: ContextMemory) => {
        return context.currentContext === "front"
      },
    },
    {
      id: "listData",
      type: "button" as const,
      label: "顧客データ取得",
      actionHandler: async () => {
        // todo 必要な情報を引数で受け取れるようにしてメッセージを送信する
          console.log('invoke front!!!');
        return Promise.resolve({})
      },
      canExecute: (context: ContextMemory) => {
        return context.currentContext === "front"
      },
    },
  ],
  immediateExecution: false
}