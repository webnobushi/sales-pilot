import { getContextWorkingMemory as getContextWorkingMemory } from "@/mastra/util";
import { mastra } from "@/mastra";

/*
 現在の会話コンテキスト情報（ワーキングメモリ）を取得する
*/
export async function GET(req: Request) {
  const frontAgent = mastra.getAgent('frontAgent');
  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get('threadId') || "default-thread";
  const resourceId = searchParams.get('resourceId') || "default-user";

  const contextWorkingMemory = await getContextWorkingMemory(frontAgent, threadId, resourceId);

  if (contextWorkingMemory) {
    try {
      return Response.json(contextWorkingMemory);
    } catch (error) {
      console.error('Failed to parse working memory:', error);
      return Response.json({ contextData: null, error: 'Failed to parse working memory' });
    }
  }

  const response = { contextData: null, currentAgent: null };
  return Response.json(response);
}

