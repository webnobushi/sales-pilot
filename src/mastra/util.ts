import { CustomUIMessage, mastra } from "@/mastra/index";
import { generateId } from "ai";
import { convertMessages } from '@mastra/core/agent';
import { Agent } from "@mastra/core";
import { ContextMemory } from "@/mastra/core/contextDefinitions";

// メッセージ保存用api ワークフローで手動保存する際に利用する
export async function storeMessage(
  threadId: string,
  resourceId: string,
  role: 'user' | 'assistant',
  data: {
    type: 'text' | 'data-custom',
    content: string | any,
    metadata?: CustomUIMessage['metadata'];
  }
) {
  const messageId = generateId();

  try {
    const storage = mastra?.getStorage();
    if (!storage) {
      console.warn('Storage not available for message saving');
      return;
    }

    const message: CustomUIMessage = {
      id: messageId,
      role,
      metadata: data.metadata,
      parts: [
        { type: data.type, text: data.content, data: data.content },
      ],
    }

    const v2Messages = convertMessages([message]).to('Mastra.V2');

    // v2メッセージにthreadIdとresourceIdを追加
    const v2MessagesWithIds = v2Messages.map(msg => ({
      ...msg,
      threadId,
      resourceId,
    }));
    console.log('v2MessagesWithIds:', v2MessagesWithIds);

    await storage.saveMessages({
      messages: v2MessagesWithIds,
      format: 'v2',
    });

  } catch (error) {
    console.error('Failed to save message to storage:', error);
  }
}

export async function getContextWorkingMemory(
  agent: Agent<any, any, any>,
  threadId: string,
  resourceId: string
) {

  const memory = await agent.getMemory();

  if (!memory) {
    console.warn('Memory not available for agent');
    return null;
  }

  try {
    const workingMemory = await memory.getWorkingMemory({
      threadId,
      resourceId,
    });

    if (workingMemory) {
      return JSON.parse(workingMemory);
    }
  } catch (error) {
    console.error('Failed to get working memory:', error);
  }

  return null;
}

export async function resetContextWorkingMemory(
  agent: Agent<any, any, any>,
  threadId: string,
  resourceId: string
) {
  const memory = await agent.getMemory();

  const resetData: ContextMemory = {
    currentContext: 'front',
    userIntent: '',
    currentInfoList: [],
    planData: {
      status: 'none',
      plan: null,
    },
  }
  memory?.updateWorkingMemory({
    threadId,
    resourceId,
    workingMemory: JSON.stringify(resetData),
  });

  return resetData;
}