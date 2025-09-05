import { z } from "zod";
import { ContextMemory } from '@/mastra/core/contextDefinitions';

// 情報項目の型定義
export type InfoItem = {
  name: string;
  description: string;
};

// アクション定義の型定義（ジェネリック型を使用）
export type ActionDefinition = {
  // 計画に必要な情報のリスト
  requiredInfoList: readonly InfoItem[];
  // 全アクション定義（各ワークフロー実行に必要な情報）
  actions: Array<{
    id: string; // アクションを一意に識別するID
    type: "button" | "select"; // アクションの種類
    label: string | ((params: any) => string); // ユーザーに表示するアクションのラベル
    actionHandler: (params: any) => Promise<any>; // 自由フォーマットで何でも定義可能にする
    canExecute: (context: ContextMemory) => boolean;
  }>;
  immediateExecution: boolean; // 即時実行する処理かどうか
};

// 情報ハンドラの型定義
export type InfoHandler = {
  name: string;
  description: string;
  handler: (params: any) => Promise<any>;
  requiredParams?: string[];
  cacheDuration?: number; // キャッシュの有効期間（秒）
};

// 情報ハンドラの実装例
export const infoHandlers: Record<string, InfoHandler> = {
  // プロジェクト一覧取得ハンドラ
  "fetch_projects": {
    name: "プロジェクト一覧取得",
    description: "現在のプロジェクト一覧を取得",
    handler: async (params: { status?: string; limit?: number }) => {
      // 実際のAPI呼び出しやデータベースアクセス
      // ここではダミーデータを返す
      return [
        { id: "proj-001", name: "Webサイトリニューアル", status: "active" },
        { id: "proj-002", name: "モバイルアプリ開発", status: "planning" }
      ];
    },
    requiredParams: [],
    cacheDuration: 300 // 5分間キャッシュ
  },

  // ユーザー情報取得ハンドラ
  "fetch_user_info": {
    name: "ユーザー情報取得",
    description: "指定されたユーザーの詳細情報を取得",
    handler: async (params: { userId: string }) => {
      // 実際のAPI呼び出し
      return {
        id: params.userId,
        name: "ユーザー名",
        email: "user@example.com",
        role: "developer"
      };
    },
    requiredParams: ["userId"],
    cacheDuration: 600 // 10分間キャッシュ
  },

  // 営業実績取得ハンドラ
  "fetch_sales_performance": {
    name: "営業実績取得",
    description: "指定期間の営業実績を取得",
    handler: async (params: { startDate: string; endDate: string }) => {
      // 実際のAPI呼び出し
      return {
        monthly_target: 1000000,
        current_achievement: 750000,
        top_performers: ["田中", "佐藤", "鈴木"]
      };
    },
    requiredParams: ["startDate", "endDate"],
    cacheDuration: 1800 // 30分間キャッシュ
  },

  // 市場動向取得ハンドラ
  "fetch_market_trends": {
    name: "市場動向取得",
    description: "最新の市場動向と競合情報を取得",
    handler: async (params: { industry?: string; region?: string }) => {
      // 実際のAPI呼び出し
      return {
        industry: params.industry || "IT",
        trends: ["AI活用の拡大", "クラウド移行の加速"],
        competitors: ["競合A", "競合B"]
      };
    },
    requiredParams: [],
    cacheDuration: 3600 // 1時間キャッシュ
  }
};

// ハンドラ実行関数
export async function executeHandler(
  handlerName: string,
  params: any
): Promise<any> {
  const handler = infoHandlers[handlerName];
  if (!handler) {
    throw new Error(`Handler not found: ${handlerName}`);
  }

  // 必須パラメータのチェック
  if (handler.requiredParams) {
    for (const param of handler.requiredParams) {
      if (!(param in params)) {
        throw new Error(`Required parameter missing: ${param}`);
      }
    }
  }

  // ハンドラを実行
  return await handler.handler(params);
}

