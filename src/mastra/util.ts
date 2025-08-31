import { CustomUIMessage, mastra } from "@/mastra/index";
import type { UIMessage, UIMessageStreamWriter } from "ai";
import { convertMessages } from '@mastra/core/agent';

// メッセージ保存用のヘルパー関数
export async function saveMessageToStorage(
  threadId: string,
  resourceId: string,
  role: 'user' | 'assistant',
  content: string,
  writer?: UIMessageStreamWriter<CustomUIMessage>,
  customData?: Record<string, any>,
) {
  try {
    const storage = mastra?.getStorage();
    if (!storage) {
      console.warn('Storage not available for message saving');
      return;
    }

    const parts: any[] = [
      { type: "text", text: content }
    ];

    // data-xxxx形式のカスタムデータをpartsに追加
    if (customData) {
      Object.entries(customData).forEach(([key, value]) => {
        if (key.startsWith('data-')) {
          parts.push({
            type: "custom",
            componentName: key,
            data: { [key]: value }
          });
        }
      });
    }

    const message: CustomUIMessage = {
      id: crypto.randomUUID(),
      role,
      metadata: {},
      parts,
    }

    // convertMessagesを使ってv3フォーマットのメッセージをv2に変換して保存
    // 型エラー回避のため、convertMessagesを使用
    const v2Messages = convertMessages([message]).to('Mastra.V2');

    // v2メッセージにthreadIdとresourceIdを追加
    const v2MessagesWithIds = v2Messages.map(msg => ({
      ...msg,
      threadId,
      resourceId,
    }));

    await storage.saveMessages({
      messages: v2MessagesWithIds,
      format: 'v2',
    });

    // ストリーミングが指定されている場合は、assistantメッセージのみストリーミング
    if (writer && role === 'assistant') {
      // v3フォーマットのメッセージをチャンクとしてストリーミング
      writer.write({
        type: 'text-delta',
        delta: content,
        id: message.id,
      });
    }
  } catch (error) {
    console.error('Failed to save message to storage:', error);
  }
}
