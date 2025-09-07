import { CustomUIMessage, mastra } from "@/mastra";
import { getContextWorkingMemory, storeMessage } from "@/mastra/util";
import { RuntimeContext } from "@mastra/core/runtime-context";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
} from 'ai';

export async function handleWorkflow(_: CustomUIMessage[], lastMessage: CustomUIMessage, threadId: string, resourceId: string) {
  const workflowInfo = lastMessage.metadata?.workflow;

  if (!workflowInfo?.name) {
    throw new Error('Workflow name is required');
  }

  const workflow = mastra.getWorkflow(workflowInfo?.name);
  // ユーザからのメッセージを保存
  storeMessage(
    threadId,
    resourceId,
    'user',
    {
      type: 'text',
      content: lastMessage.parts.find(part => part.type === 'text')?.text || '',
    }
  )

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const statusId = generateId();

      try {
        const messageId = generateId();

        const runtimeContext = new RuntimeContext();
        runtimeContext.set("messageId", messageId);
        runtimeContext.set("statusId", statusId);
        runtimeContext.set("resourceId", resourceId);
        runtimeContext.set("threadId", threadId);
        const userFeedback = lastMessage.parts.find(part => part.type === 'text')?.text || '';

        const contextMemory = await getContextWorkingMemory(threadId, resourceId);

        const run = await workflow.createRunAsync();
        console.log('workflowを実行します');
        const stream = run.streamVNext({
          inputData: {
            userFeedback,
            contextMemory,
          },
          runtimeContext,
        });
        // @see https://mastra.ai/ja/docs/agents/streaming#:~:text=%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%83%99%E3%83%BC%E3%82%B9%E3%81%AE%E3%83%84%E3%83%BC%E3%83%AB%E5%86%85%E3%81%A7%E3%82%B9%E3%83%88%E3%83%AA%E3%83%BC%E3%83%9F%E3%83%B3%E3%82%B0%E3%82%92%E5%88%A9%E7%94%A8%E3%81%99%E3%82%8B%E3%81%AB%E3%81%AF%E3%80%81%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%A7%20streamVNext%20%E3%82%92%E5%91%BC%E3%81%B3%E5%87%BA%E3%81%97%E3%80%81writer%20%E3%81%AB%E3%83%91%E3%82%A4%E3%83%97%E3%81%97%E3%81%BE%E3%81%99%3A
        // await stream.pipeTo(writer);

        // ストリーミング開始を通知
        writer.write({
          type: 'data-status',
          id: statusId,
          data: { status: 'started' },
          // transient: true, // Won't be added to message history
        });

        // text-startイベントを送信
        writer.write({
          type: 'text-start',
          id: messageId
        });

        // 完成系のメッセージを取得するための変数
        let finalText = "";
        // todo これおかしい。partsの型にする？？
        let finalData = [];
        // todo metadataの保存も必要

        // ストリームを処理
        for await (const chunk of stream) {
          // console.log('Stream chunk:', chunk);

          // ToolStreamからのすべてのチャンクを処理
          if (chunk.type === 'text-delta') {
            const text = (chunk as { payload: { text: string } }).payload?.text;
            if (text) {
              finalText += text; // 完成系のテキストを蓄積
              writer.write({
                type: 'text-delta',
                delta: text,
                id: messageId
              });
            }
          } else if (chunk.type === 'step-output') {
            // ToolStreamからのstep-outputを処理
            const output = (chunk as { payload: { output: { type: string; delta?: string; id?: string; data?: Record<string, unknown> } } }).payload?.output;
            if (output) {
              if (output.type === 'text-delta' && output.delta) {
                if (finalText === '') {
                  writer.write({
                    type: 'data-status',
                    id: statusId,
                    data: { status: 'first chunk' },
                    // transient: true, // Won't be added to message history
                  });
                }
                finalText += output.delta; // 完成系のテキストを蓄積
                writer.write({
                  type: 'text-delta',
                  delta: output.delta,
                  id: messageId
                });
              } else if (output.type === 'data-status') {
                writer.write({
                  type: 'data-status',
                  id: statusId,
                  data: output.data
                });
              } else if (output.type === 'data-custom' && output.data) {
                writer.write({
                  type: 'data-custom',
                  id: messageId,
                  data: output.data
                });
                // カスタムデータを蓄積
                finalData.push({
                  type: 'data-custom',
                  id: messageId,
                  data: output.data,
                });
              }
            }
          } else {
            // その他のチャンクタイプもログ出力
            // console.log('Other chunk type:', chunk.type, chunk);
          }
        }

        // 完成系のメッセージをログ出力（デバッグ用）
        console.log('Final message:', {
          text: finalText,
          data: finalData,
          messageId
        });

        storeMessage(
          threadId || "default-thread",
          resourceId || "default-user",
          'assistant',
          {
            type: 'text',
            content: finalText || finalData,
            // metadata
          }
        )

        // text-endイベントを送信
        writer.write({
          type: 'text-end',
          id: messageId
        });

        // ステータス完了
        writer.write({
          type: 'data-status',
          id: statusId,
          data: { status: 'completed' },
        });

      } catch (error) {
        console.error('DefaultWorkflow error:', error);

        // エラーメッセージを送信
        writer.write({
          type: 'text-delta',
          delta: `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
          id: generateId()
        });

        // エラーステータス
        writer.write({
          type: 'data-status',
          id: statusId,
          data: { status: 'error', error: String(error) },
        });
      }
    },
  });

  return createUIMessageStreamResponse({ stream });

}