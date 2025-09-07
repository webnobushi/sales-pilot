import { CustomUIMessage } from '@/mastra';
import { handleByFrontAgent } from '@/app/api/chat/agent/_front/route';
import { handleWorkflow } from '@/app/api/chat/agent/_workflow/route';

export async function POST(req: Request) {
  const { messages, threadId, resourceId } = await req.json();
  const lastMessage = messages[messages.length - 1] as CustomUIMessage;
  console.log('lastMessage:', lastMessage);

  // デフォルト値を設定
  const finalThreadId = threadId || "default-thread";
  const finalResourceId = resourceId || "default-user";

  if (lastMessage.metadata?.workflow?.name) {
    return await handleWorkflow(messages, lastMessage, finalThreadId, finalResourceId);
  } else {
    return await handleByFrontAgent(messages, lastMessage, finalThreadId, finalResourceId);
  }
}
