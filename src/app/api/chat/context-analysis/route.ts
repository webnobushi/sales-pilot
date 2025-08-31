import { defaultAgent } from '@/mastra/agents/contextAgent';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get('threadId') || "default-thread";
  const resourceId = searchParams.get('resourceId') || "default-user";

  // ストレージからの取得
  const memory = await defaultAgent.getMemory();
  if (!memory) {
    return Response.json({ contextData: null });
  }

  const workingMemory = await memory.getWorkingMemory({
    threadId,
    resourceId,
  });

  if (workingMemory) {
    return Response.json({ contextData: JSON.parse(workingMemory) });
  }

  return Response.json({ contextData: null });
}

