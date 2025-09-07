import { CustomUIMessage } from '@/mastra';
import { CommonWorkingMemory } from '@/mastra/core/contextDefinitions';
import { RuntimeContext } from '@mastra/core/runtime-context';
import { createUIMessageStreamResponse, createUIMessageStream, generateId } from 'ai';
import { mastra } from "@/mastra";

export async function handleByFrontAgent(messages: CustomUIMessage[], lastMessage: CustomUIMessage, threadId: string, resourceId: string) {
  const frontAgent = mastra.getAgent('frontAgent');

  // metadataから現在の文脈を取得
  const currentContext = (lastMessage.metadata)?.currentContext || 'front';

  // currentContextの値に基づいてruntimeContextを設定
  const runtimeContext = new RuntimeContext<{ currentContext: CommonWorkingMemory["currentContext"] }>();
  runtimeContext.set("currentContext", currentContext);

  // todo metadataにワークフローの実行指定されていたらワークフローストリーニングを実行
  // todo workflow.route.ts を移行する

  // todo ワークフローの実行処理内でワーキングメモリを手動更新する（mastra.getAgent("frontAgent").getMemory()で取れるはず）

  try {
    const result = await frontAgent.streamVNext([lastMessage], {
      format: 'aisdk',
      memory: {
        thread: threadId,
        resource: resourceId,
      },
      runtimeContext,
    });

    // ストリーミングレスポンスを作成し、処理完了後にメモリを参照
    return createUIMessageStreamResponse({
      stream: createUIMessageStream({
        execute: async ({ writer }) => {
          // frontAgentのストリームを実行
          // これは一時回答のようなもので、文脈解釈は終わっていない状態でllmがそれっぽい回答をしてくれているだけ。
          for await (const chunk of result.fullStream) {
            if (chunk.type === 'text-start') {
              writer.write({
                type: 'text-start',
                id: chunk.id
              });
            } else if (chunk.type === 'text-delta') {
              writer.write({
                type: 'text-delta',
                delta: chunk.text,
                id: chunk.id
              });
            } else if (chunk.type === 'text-end') {
              writer.write({
                type: 'text-end',
                id: chunk.id
              });
            } else if (chunk.type === 'tool-result' && chunk.output?.error) {
              // ツール実行エラーが発生した場合
              console.log('ツール実行エラー:', chunk.output.message);

              // エラーメッセージを表示
              const errorId = generateId();
              writer.write({
                type: 'text-start',
                id: errorId
              });
              writer.write({
                type: 'text-delta',
                delta: '\n\n⚠️ エラーが発生しました: ' + chunk.output.message,
                id: errorId
              });
              writer.write({
                type: 'text-end',
                id: errorId
              });
            } else if (chunk.type === 'finish' && chunk.finishReason === 'tool-calls') {
              // ツール呼び出しで終了した場合、何も表示されていない可能性がある
              console.log('ツール呼び出しで終了、応答がない場合はデフォルトメッセージを表示');

              // 応答が生成されていない場合のフォールバック
              const fallbackId = generateId();
              writer.write({
                type: 'text-start',
                id: fallbackId
              });
              writer.write({
                type: 'text-delta',
                delta: '\n\n処理が完了しました。何か他にお手伝いできることはありますか？',
                id: fallbackId
              });
              writer.write({
                type: 'text-end',
                id: fallbackId
              });
            }
          }

          // // 以降はエージェントを動的に切り替える場合の処理なのでフロントから指定がある場合は実行しない
          // if (requestedAgent) {
          //   console.log('フロントからエージェント指定されているので、処理を終了します...');
          //   return;
          // }

          // // 更新データを確認
          // const checkWorkingMemory = await getAgentWorkingMemory<FrontWorkingMemorySchema>(agent, finalThreadId, finalResourceId);

          // console.log('updated workingMemory:', checkWorkingMemory);

          // if (checkWorkingMemory) {
          //   try {
          //     switch (checkWorkingMemory.agent) {
          //       case 'list':
          //         // listDataAgentの処理を実行
          //         const listDataResult = await listDataAgent.streamVNext([lastMessage], {
          //           format: 'aisdk',
          //           memory: {
          //             thread: finalThreadId,
          //             resource: finalResourceId,
          //           },
          //         });
          //         console.log('listを実行します...');

          //         // listDataAgentのストリームを実行
          //         for await (const chunk of listDataResult.fullStream) {
          //           if (chunk.type === 'text-start') {
          //             writer.write({
          //               type: 'text-start',
          //               id: chunk.id
          //             });
          //           } else if (chunk.type === 'text-delta') {
          //             writer.write({
          //               type: 'text-delta',
          //               delta: chunk.text,
          //               id: chunk.id
          //             });
          //           } else if (chunk.type === 'text-end') {
          //             writer.write({
          //               type: 'text-end',
          //               id: chunk.id
          //             });
          //           }
          //         }

          //         const listDataMemory = await listDataAgent.getMemory();
          //         const listDataWorkingMemory = await listDataMemory?.getWorkingMemory({
          //           threadId: finalThreadId,
          //           resourceId: finalResourceId,
          //         });

          //         console.log('listData workingMemory:', listDataWorkingMemory);
          //         // todo ワークフロー実行可能かをチェックする


          //         break;
          //       case 'plan':
          //         // planAgentの処理は別途実装
          //         writer.write({
          //           type: 'text-start',
          //           id: generateId()
          //         });
          //         writer.write({
          //           type: 'text-delta',
          //           delta: '\n\nplanAgentの処理を実行します...',
          //           id: generateId()
          //         });
          //         writer.write({
          //           type: 'text-end',
          //           id: generateId()
          //         });
          //         break;
          //       case 'none':
          //       default:
          //         // 追加の処理なし
          //         break;
          //     }
          //   } catch (error) {
          //     console.error('Failed to parse updated working memory:', error);
          //   }
          // }
        },
      }),
    });
  } catch (error) {
    console.error('Agent error:', error);
    throw error;
  }

}