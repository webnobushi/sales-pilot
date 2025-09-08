import z from "zod";

// ワークフロー名の共通enum定義
export const workflowNameEnum = z.enum(["planWorkflow", "applyPlanWorkflow"]).nullable();

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
  })).optional().describe("LLMが判定する現在収集済みの情報リスト"),

  planData: z.object({
    status: z.enum(["none", "planned", "completed"]).default("none").describe("計画の現在の状態"),
    plan: z.string().nullable().describe("計画の詳細データ（オブジェクト、配列など）"),
    workflowName: workflowNameEnum.optional().describe("現在実行中のワークフローの名前"),
  }).describe("計画データの管理（手動更新）"),
});

export type ContextMemory = z.infer<typeof contextMemorySchema>;