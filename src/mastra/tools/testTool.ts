import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// 簡単なテストツール
export const simpleTestTool = createTool({
  id: "simple-test-tool",
  description: "簡単なテストツール。入力された文字列をそのまま返します。",
  inputSchema: z.object({
    input: z.string().describe("入力文字列"),
  }),
  outputSchema: z.object({
    result: z.string(),
    timestamp: z.string(),
  }),
  execute: async ({ context }) => {
    console.log("Simple test tool executed with input:", context.input);

    // 即座に返す
    return {
      result: `入力: ${context.input}`,
      timestamp: new Date().toISOString(),
    };
  },
});

// 遅延をシミュレートするツール
export const delayedTestTool = createTool({
  id: "delayed-test-tool",
  description: "遅延をシミュレートするテストツール。指定された時間待機してから結果を返します。",
  inputSchema: z.object({
    input: z.string().describe("入力文字列"),
    delayMs: z.number().describe("遅延時間（ミリ秒）").default(1000),
  }),
  outputSchema: z.object({
    result: z.string(),
    timestamp: z.string(),
    executionTime: z.number(),
  }),
  execute: async ({ context }) => {
    const startTime = Date.now();
    console.log(`Delayed test tool started with input: ${context.input}, delay: ${context.delayMs}ms`);

    // 指定された時間待機
    await new Promise(resolve => setTimeout(resolve, context.delayMs));

    const executionTime = Date.now() - startTime;
    console.log(`Delayed test tool completed in ${executionTime}ms`);

    return {
      result: `遅延実行完了: ${context.input}`,
      timestamp: new Date().toISOString(),
      executionTime,
    };
  },
});

// 大量データを返すツール（DB一覧データをシミュレート）
export const largeDataTool = createTool({
  id: "large-data-tool",
  description: "大量のデータを返すテストツール。DB一覧データの遅延問題をシミュレートします。",
  inputSchema: z.object({
    recordCount: z.number().describe("生成するレコード数").default(100),
  }),
  outputSchema: z.object({
    records: z.array(z.object({
      id: z.number(),
      name: z.string(),
      description: z.string(),
      createdAt: z.string(),
    })),
    totalCount: z.number(),
    timestamp: z.string(),
  }),
  execute: async ({ context }) => {
    console.log(`Large data tool started, generating ${context.recordCount} records`);
    const startTime = Date.now();

    // 大量のレコードを生成
    const records = Array.from({ length: context.recordCount }, (_, i) => ({
      id: i + 1,
      name: `レコード ${i + 1}`,
      description: `これはテスト用のレコード ${i + 1} です。大量データの遅延問題を検証するために使用されます。`,
      createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
    }));
    console.log('records:', records);

    const executionTime = Date.now() - startTime;
    console.log(`Large data tool completed in ${executionTime}ms, generated ${records.length} records`);

    return {
      records,
      totalCount: records.length,
      timestamp: new Date().toISOString(),
    };
  },
});
