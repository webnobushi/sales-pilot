// Mastraエージェント用のチャットルート
import { CustomUIMessage } from '@/mastra';
import { frontAgent } from '@/mastra/features/front/frontAgent';
import { listDataAgent } from '@/mastra/features/list-data/listDataAgent';
import { createUIMessageStreamResponse, createUIMessageStream, generateId } from 'ai';

export async function POST(req: Request) {
  const { messages, threadId, resourceId } = await req.json();
  // console.log('messages:', JSON.stringify(messages, null, 2));

  const lastMessage = messages[messages.length - 1] as CustomUIMessage;
  console.log('lastMessage:', lastMessage);

  // todo 最初にワーキングメモリを参照してどのエージェントを呼び出すかを決める（今は初回向けのロジックしかない）
  
  try {
    // frontAgentのストリーミング処理を開始
    const result = await frontAgent.streamVNext([lastMessage], {
      format: 'aisdk',
      memory: {
        thread: threadId || "default-thread",
        resource: resourceId || "default-user",
      },
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
            }
          }

          // ストリーミング完了後、メモリを参照
          const memory = await frontAgent.getMemory();
          const workingMemory = await memory?.getWorkingMemory({
            threadId: threadId || "default-thread",
            resourceId: resourceId || "default-user",
          });

          console.log('workingMemory:', workingMemory);

          if (workingMemory) {
            const parsedWorkingMemory = JSON.parse(workingMemory);
            switch (parsedWorkingMemory.agent) {
              case 'listDataAgent':
                // listDataAgentの処理を実行
                const listDataResult = await listDataAgent.streamVNext([lastMessage], {
                  format: 'aisdk',
                  memory: {
                    thread: threadId || "default-thread",
                    resource: resourceId || "default-user",
                  },
                });
                console.log('listDataAgentを実行します...');

                // listDataAgentのストリームを実行
                for await (const chunk of listDataResult.fullStream) {
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
                  }
                }

                const memory = await listDataAgent.getMemory();
                const workingMemory = await memory?.getWorkingMemory({
                  threadId: threadId || "default-thread",
                  resourceId: resourceId || "default-user",
                });

                console.log('listData workingMemory:', workingMemory);
                // todo ワークフロー実行可能かをチェックする


                break;
              case 'planAgent':
                // planAgentの処理は別途実装
                writer.write({
                  type: 'text-start',
                  id: generateId()
                });
                writer.write({
                  type: 'text-delta',
                  delta: '\n\nplanAgentの処理を実行します...',
                  id: generateId()
                });
                writer.write({
                  type: 'text-end',
                  id: generateId()
                });
                break;
              case 'none':
              default:
                // 追加の処理なし
                break;
            }
          }
        },
      }),
    });
  } catch (error) {
    console.error('Agent error:', error);
    throw error;
  }
}


// if (lastMessage.metadata?.workflowName) {
//   const workflowName = lastMessage.metadata.workflowName;
//   // ワーキングメモリをリセット
//   const memory = await defaultAgent.getMemory();
//   await memory?.updateWorkingMemory({
//     threadId: threadId || "default-thread",
//     resourceId: resourceId || "default-user",
//     workingMemory: JSON.stringify({
//       workflowOptions: [],
//       shouldTriggerWorkflow: false,
//       contextSummary: "",
//       accumulatedData: {},
//       missingData: [],
//       userIntent: "",
//       suggestedAction: "",
//     }),
//   });

//   return createUIMessageStreamResponse({
//     stream: createUIMessageStream({
//       execute: async ({ writer }) => {
//         writer.write({
//           type: 'text-delta',
//           delta: workflowName + "を実行しました",
//           id: generateId()
//         });
//       },
//     }),
//   });
// }

