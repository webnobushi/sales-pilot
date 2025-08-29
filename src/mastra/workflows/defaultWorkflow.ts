import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { defaultAgent } from "@/mastra/agents/defaultAgent";
import { PerformanceTracker, logPerformance } from "@/lib/performance";

// デフォルトワークフローの入力スキーマ
// todo ワークフロー間で共通化する。
const defaultWorkflowInputSchema = z.object({
  userInput: z.string(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional(),
});

// デフォルトワークフローの出力スキーマ
const defaultWorkflowOutputSchema = z.object({
  result: z.string(),
  success: z.boolean(),
  performanceMetrics: z.object({
    toolExecutionTime: z.number(),
    responseGenerationTime: z.number(),
    totalTime: z.number(),
    toolName: z.string().optional(),
  }).optional(),
});

// デフォルトワークフローのメインステップ
const defaultWorkflowStep = createStep({
  id: "default-workflow-step",
  inputSchema: defaultWorkflowInputSchema,
  outputSchema: defaultWorkflowOutputSchema,
  execute: async ({ inputData, runtimeContext, writer }) => {
    const tracker = new PerformanceTracker();
    let toolUsed = false;
    let toolName = 'unknown-tool';
    let toolExecutionTime = 0;
    let responseGenerationTime = 0;

    try {
      const { userInput } = inputData;
      const messageId = runtimeContext?.get?.("messageId") as string;
      const statusId = runtimeContext?.get?.("statusId") as string;

      const currentUserId = runtimeContext?.get?.("currentUserId") as string;
      const threadId = currentUserId ? `user-${currentUserId}` : "user-session";

      // レスポンス生成開始
      tracker.startResponseGeneration();

      // defaultAgentを使用して応答を生成
      const stream = await defaultAgent.streamVNext([

        {
          role: 'user',
          content: userInput,
          id: crypto.randomUUID(),
          createdAt: new Date()
        }
      ], {
        memory: { thread: threadId, resource: "memory-chat" }
      });

      writer.write({
        type: 'data-status',
        data: { status: 'streaming' },
        id: statusId
      });

      // ストリーミング結果を直接APIに送信
      for await (const chunk of stream.fullStream) {
        // console.log('Agent chunk:', chunk);
        if (chunk.type === 'text-delta') {
          const text = (chunk as { payload: { text: string } }).payload?.text;
          // console.log('Streaming text:', text);

          writer.write({
            type: 'text-delta',
            delta: text,
            id: messageId
          });
        } else if (chunk.type === 'tool-call') {
          // ツール実行開始を検出
          const toolCall = chunk as any;
          toolName = toolCall.payload?.toolName || 'unknown-tool';
          toolUsed = true;
          tracker.startToolExecution();
          console.log(`🔧 Tool call detected: ${toolName}`);
        } else if (chunk.type === 'tool-result') {
          // ツール実行完了を検出
          toolExecutionTime = tracker.endToolExecution();
          console.log(`✅ Tool result received`);
        }
      }

      // レスポンス生成完了
      responseGenerationTime = tracker.endResponseGeneration();

      // 最終結果を取得
      const finalText = await stream.text;
      const metrics = tracker.getMetrics(toolUsed ? toolName : undefined);

      // 実際の時間を設定
      metrics.toolExecutionTime = toolExecutionTime;
      metrics.responseGenerationTime = responseGenerationTime;

      // パフォーマンスをログに記録
      logPerformance(metrics);

      // 計測データを応答に含める
      const performanceInfo = `
📊 パフォーマンス情報:
- 総時間: ${metrics.totalTime}ms
- ツール実行時間: ${metrics.toolExecutionTime}ms
- 応答生成時間: ${metrics.responseGenerationTime}ms
- 使用ツール: ${metrics.toolName || 'なし'}
      `.trim();

      const responseWithMetrics = `${finalText}\n\n${performanceInfo}`;

      // 計測データをストリーミングで送信
      writer.write({
        type: 'text-delta',
        delta: '\n\n' + performanceInfo,
        id: messageId
      });

      return {
        result: responseWithMetrics,
        success: true,
        performanceMetrics: {
          toolExecutionTime: metrics.toolExecutionTime,
          responseGenerationTime: metrics.responseGenerationTime,
          totalTime: metrics.totalTime,
          toolName: metrics.toolName,
        }
      };
    } catch (error) {
      console.error('Default workflow error:', error);
      const metrics = tracker.getMetrics(toolUsed ? toolName : undefined);

      return {
        result: `申し訳ございません。エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
        success: false,
        performanceMetrics: {
          toolExecutionTime: metrics.toolExecutionTime,
          responseGenerationTime: metrics.responseGenerationTime,
          totalTime: metrics.totalTime,
          toolName: metrics.toolName,
        }
      };
    }
  }
});

// デフォルトワークフローの定義
export const defaultWorkflow = createWorkflow({
  id: "defaultWorkflow",
  inputSchema: defaultWorkflowInputSchema,
  outputSchema: defaultWorkflowOutputSchema,
  steps: [defaultWorkflowStep]
}).then(defaultWorkflowStep).commit();
