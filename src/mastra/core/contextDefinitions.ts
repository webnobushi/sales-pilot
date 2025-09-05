import z from "zod";

export const commonWorkingMemorySchema = z.object({
  currentContext: z.enum(['front', 'plan', 'list',]).describe("現在の文脈").default('front'),
  userIntent: z.string().default("").describe("ユーザーの要望のサマリー"),
});

export type CommonWorkingMemory = z.infer<typeof commonWorkingMemorySchema>;

// 各専門文脈ののスキーマ
export const contextMemorySchema = z.object({
  ...commonWorkingMemorySchema.shape,
  currentInfoList: z.array(z.object({
    name: z.string().describe("情報の種類を識別する文字列"),
    value: z.any().describe("実際の情報の値（オブジェクト、配列、プリミティブ値など）"),
  })).describe("LLMが判定する現在収集済みの情報リスト"),

  planData: z.object({
    status: z.enum(["none", "planning", "planned", "executing", "completed"]).default("none").describe("計画の現在の状態：none（なし）、planning（計画中）、planned（計画済み）、executing（実行中）、completed（完了）"),
    plan: z.any().optional().describe("計画の詳細データ（オブジェクト、配列など）"),
  }).default({ status: "none" }).describe("計画データの管理（手動更新）"),
});

export type ContextMemory = z.infer<typeof contextMemorySchema>;