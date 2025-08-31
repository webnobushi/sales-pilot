import { RuntimeContext } from "@mastra/core/runtime-context";
import { generateId, UIMessage, createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { z } from "zod";

import { defaultAgent } from "@/mastra/agents/contextAgent";
import { contextAgent } from "@/mastra/agents/contextAgent";

// 文脈分析のスキーマ
const contextSchema = z.object({
  workflowOptions: z.array(z.object({
    id: z.string(),
    label: z.string(),
    description: z.string(),
    confidence: z.number().min(0).max(1),
    requiredData: z.array(z.string()).optional()
  })).optional(),
  shouldTriggerWorkflow: z.boolean(),
  contextSummary: z.string().optional(),
  accumulatedData: z.record(z.string(), z.any()).optional(),
  missingData: z.array(z.string()).optional()
});

// カスタムメッセージタイプの定義
type ContextData = z.infer<typeof contextSchema>;

type CustomUIMessage = UIMessage<{
  status?: string;
  error?: string;
}, {
  'context': ContextData,
}, never>;

export async function POST(req: Request) {
  console.log('Hybrid route called');
  const { messages, threadId, resourceId } = await req.json();
  console.log('Request data:', { messages: messages.length, threadId, resourceId });
  const lastMessage = messages[messages.length - 1] as UIMessage;

  const stream = createUIMessageStream<CustomUIMessage>({
    execute: async ({ writer }) => {
      console.log('Stream execute function called');
      const statusId = generateId();
      const messageId = generateId();

      try {
        const runtimeContext = new RuntimeContext();
        runtimeContext.set("messageId", messageId);
        runtimeContext.set("statusId", statusId);

        // text-startイベントを送信
        writer.write({
          type: 'text-start',
          id: messageId
        });

        // メインエージェントのストリーミング（即座に開始）
        const mainStream = await defaultAgent.streamVNext(messages, {
          format: 'aisdk',
          memory: {
            thread: threadId || "default-thread",
            resource: resourceId || "default-user"
          }
        });

        // 文脈分析エージェント（即座に実行）
        console.log('Starting context analysis...');
        try {
          console.log('Calling contextAgent.generateVNext...');
          const contextResult = await contextAgent.generateVNext(messages, {
            format: 'aisdk',
            output: contextSchema,
          });

          console.log('contextResult:', contextResult);
          console.log('contextResult.object:', contextResult.object);
          console.log('contextResult.type:', typeof contextResult.object);

          // contextResult.objectが存在するかチェック
          if (!contextResult.object) {
            console.error('contextResult.object is undefined, skipping Data Parts');
            return;
          }

          // Data Partsを使用してワークフローオプションを送信
          // todo dataオブジェクト用のストレージ保存を行う
          writer.write({
            type: 'data-context',
            id: 'context-data',
            data: {
              workflowOptions: contextResult.object.workflowOptions || undefined,
              shouldTriggerWorkflow: contextResult.object.shouldTriggerWorkflow || false,
              contextSummary: contextResult.object.contextSummary || '',
              accumulatedData: contextResult.object.accumulatedData || {},
              missingData: contextResult.object.missingData || []
            }
          });
        } catch (error) {
          console.error('Context analysis failed:', error);
          console.error('Error details:', {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
          // エラーが発生してもメインストリームは継続
        }

        // メインストリームを即座に処理（文脈分析を待たない）
        for await (const chunk of mainStream.fullStream) {
          if (chunk.type === 'text-delta') {
            const text = (chunk as any).text || (chunk as any).payload?.text;
            if (text) {
              writer.write({
                type: 'text-delta',
                delta: text,
                id: messageId
              });
            }
          }
        }

        // text-endイベントを送信
        writer.write({
          type: 'text-end',
          id: messageId
        });

      } catch (error) {
        console.error('Hybrid chat error:', error);

        // エラー時の処理
        writer.write({
          type: 'text-delta',
          delta: `申し訳ございません。エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
          id: messageId
        });

        writer.write({
          type: 'text-end',
          id: messageId
        });
      }
    }
  });

  return createUIMessageStreamResponse({ stream });
}
