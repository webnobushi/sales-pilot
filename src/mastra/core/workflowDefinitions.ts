import { Action } from '@/app/components/Actions';
import { ContextMemory } from '@/mastra/core/contextDefinitions';

// 情報項目の型定義
export type InfoItem = {
  name: string;
  description: string;
};

// アクション定義の型定義
export type ActionDefinition = {
  // 計画に必要な情報のリスト
  requiredInfoList: readonly InfoItem[];
  // 全アクション定義（各ワークフロー実行に必要な情報）
  actions: Array<{
    id: string; // アクションを一意に識別するID
    type: "button" | "select"; // アクションの種類
    label: string | ((params: any) => string); // ユーザーに表示するアクションのラベル
    actionHandler: (params: ActionHandlerParams) => Promise<boolean>;
    withUpdateMemoryOnComplete?: boolean; // アクション実行後にメモリを更新する
    canExecute: (context: ContextMemory) => boolean;
  }>;
  immediateExecution: boolean; // 即時実行する処理かどうか
};

export type ActionHandlerParams = {
  threadId: string;
  resourceId: string;
  context: ContextMemory | null;
  // todo 型をちゃんと定義する(できればeventごとにdataの型を定義する)
  emit: (event: string, data?: any) => void;
};