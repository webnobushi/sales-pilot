// エージェントの会話履歴取得API
import { defaultAgent } from '@/mastra/agents/defaultAgent';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get('threadId') || "default-thread";
    const resourceId = searchParams.get('resourceId') || "default-user";
    const limit = parseInt(searchParams.get('limit') || '50');

    // エージェントのメモリから履歴を取得
    const memory = await defaultAgent.getMemory();
    if (!memory) {
      return Response.json({ messages: [] });
    }

    try {
      // メッセージ履歴を取得
      const { uiMessages } = await memory.query({
        threadId,
        resourceId,
        selectBy: {
          last: limit,
        },
      });
      console.log('uiMessages:', JSON.stringify(uiMessages, null, 2));

      return Response.json({
        messages: uiMessages, // AI SDK v5のUIMessage形式を直接使用
        threadId,
        resourceId,
        totalCount: uiMessages.length,
      });
    } catch (queryError: any) {
      // スレッドが存在しない場合は空の配列を返す
      if (queryError.message?.includes('No thread found')) {
        return Response.json({
          messages: [],
          threadId,
          resourceId,
          totalCount: 0,
        });
      }
      throw queryError;
    }

  } catch (error) {
    console.error('History fetch error:', error);
    return Response.json(
      { error: 'Failed to fetch conversation history' },
      { status: 500 }
    );
  }
}
