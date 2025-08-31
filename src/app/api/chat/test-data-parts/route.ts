import { generateId, UIMessage, createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { z } from "zod";

// テスト用のデータスキーマ
const testDataSchema = z.object({
  message: z.string(),
  timestamp: z.string(),
  count: z.number()
});

// カスタムメッセージタイプの定義
type TestUIMessage = UIMessage<{
  status?: string;
  error?: string;
}, {
  'test-data': z.infer<typeof testDataSchema>;
}, never>;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const stream = createUIMessageStream<TestUIMessage>({
    execute: async ({ writer }) => {
      const messageId = generateId();

      try {
        // text-startイベントを送信
        writer.write({
          type: 'text-start',
          id: messageId
        });

        // テキストの一部を送信
        writer.write({
          type: 'text-delta',
          delta: 'これはテストメッセージです。',
          id: messageId
        });

        // Data Partを送信
        writer.write({
          type: 'data-test-data',
          id: 'test-data-1',
          data: {
            message: 'テストデータです',
            timestamp: new Date().toISOString(),
            count: 42
          }
        });

        // テキストの残りを送信
        writer.write({
          type: 'text-delta',
          delta: ' Data Partsが正しく動作しているかテストしています。',
          id: messageId
        });

        // text-endイベントを送信
        writer.write({
          type: 'text-end',
          id: messageId
        });

      } catch (error) {
        console.error('Test error:', error);

        writer.write({
          type: 'text-delta',
          delta: `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
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
