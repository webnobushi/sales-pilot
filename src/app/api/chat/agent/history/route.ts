import { mastra } from "@/mastra";

export async function GET(req: Request) {
  const frontAgent = mastra.getAgent('frontAgent');
  try {
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get('threadId') || "default-thread";
    const resourceId = searchParams.get('resourceId') || "default-user";
    const limit = parseInt(searchParams.get('limit') || '50');

    // エージェントのメモリから履歴を取得
    const memory = await frontAgent.getMemory();
    if (!memory) {
      return Response.json({ messages: [] });
    }

    // スレッドの存在確認
    let thread = null;
    try {
      thread = await memory.getThreadById({ threadId });
    } catch (error) {
      console.log('スレッドの存在確認でエラーが発生しました:', error);
    }

    // スレッドが存在しない場合は作成
    if (!thread) {
      try {
        console.log('スレッドが存在しないため、新しく作成します:', { threadId, resourceId });
        thread = await memory.createThread({
          threadId,
          resourceId,
          title: '新規会話',
        });
        console.log('スレッドを作成しました:', thread.id);

        // 新規スレッドの場合は空の履歴を返す
        return Response.json({
          messages: [],
          threadId: thread.id,
          resourceId,
          totalCount: 0,
          isNewThread: true,
        });
      } catch (createError: any) {
        console.error('スレッド作成エラー:', createError);
        // スレッド作成に失敗した場合も空の履歴を返す
        return Response.json({
          messages: [],
          threadId,
          resourceId,
          totalCount: 0,
          isNewThread: true,
          error: 'スレッド作成に失敗しました',
        });
      }
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
      // console.log('uiMessages:', uiMessages);
      return Response.json({
        messages: uiMessages,
        threadId,
        resourceId,
        totalCount: uiMessages.length,
      });
    } catch (queryError: any) {
      console.error('queryError:', queryError);
      // その他のエラーの場合は空の配列を返す
      console.log('メッセージ履歴の取得に失敗したため、空の履歴を返します');
      return Response.json({
        messages: [],
        threadId,
        resourceId,
        totalCount: 0,
        error: '履歴の取得に失敗しました',
      });
    }

  } catch (error) {
    console.error('History fetch error:', error);
    return Response.json(
      { error: 'Failed to fetch conversation history' },
      { status: 500 }
    );
  }
}
