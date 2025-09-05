import { sampleAgent } from '@/mastra/features/sample/sampleAgent';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

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
});


const sampleWorkflowStep = createStep({
  id: "sample-workflow-step",
  inputSchema: defaultWorkflowInputSchema,
  outputSchema: defaultWorkflowOutputSchema,
  execute: async ({ inputData, runtimeContext, writer }) => {
    let toolUsed = false;
    let toolName = 'unknown-tool';

    try {
      const { userInput } = inputData;
      const messageId = runtimeContext?.get?.("messageId") as string;
      const statusId = runtimeContext?.get?.("statusId") as string;

      const currentUserId = runtimeContext?.get?.("currentUserId") as string;
      const threadId = currentUserId ? `user-${currentUserId}` : "user-session";

      // defaultAgentを使用して応答を生成
      const stream = await sampleAgent.streamVNext([
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
          console.log(`🔧 Tool call detected: ${toolName}`);
        } else if (chunk.type === 'tool-result') {
          // ツール実行完了を検出
          console.log(`✅ Tool result received`);
        }
      }

      // 最終結果を取得
      const finalText = await stream.text;

      return {
        result: finalText,
        success: true,
      };
    } catch (error) {
      console.error('Default workflow error:', error);

      return {
        result: `申し訳ございません。エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
        success: false,
      };
    }
  }
});

// デフォルトワークフローの定義
export const defaultWorkflow = createWorkflow({
  id: "defaultWorkflow",
  inputSchema: defaultWorkflowInputSchema,
  outputSchema: defaultWorkflowOutputSchema,
  steps: [sampleWorkflowStep]
}).then(sampleWorkflowStep).commit();
