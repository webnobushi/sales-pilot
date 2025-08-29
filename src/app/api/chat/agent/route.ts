// Mastraエージェント用のチャットルート
import { defaultAgent } from '@/mastra/agents/defaultAgent';

export async function POST(req: Request) {
  const { messages, threadId, resourceId } = await req.json();
  try {
    const result = await defaultAgent.streamVNext(messages, {
      format: 'aisdk',
      memory: {
        thread: threadId || "default-thread",
        resource: resourceId || "default-user",
      },
    });
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Agent error:', error);
    throw error;
  }
}
