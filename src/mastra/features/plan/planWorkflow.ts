import { planAgent } from "@/mastra/features/plan/planAgent";
import { updateContextWorkingMemory } from "@/mastra/util";
import { createStep, createWorkflow } from "@mastra/core";
import z from "zod";

const inputWorkflowInputSchema = z.object({
  userFeedback: z.string(),
});

const outputWorkflowOutputSchema = z.object({
  result: z.string().describe("計画された内容"),
  success: z.boolean(),
});

const planWorkflowStep = createStep({
  id: "plan-workflow-step",
  inputSchema: inputWorkflowInputSchema,
  outputSchema: outputWorkflowOutputSchema,
  execute: async ({ inputData, runtimeContext, writer,  }) => {
    console.log('✅ planWorkflowStepを実行します');
    try {
      const { userFeedback } = inputData;
      const threadId = runtimeContext?.get?.("threadId") as string;
      const resourceId = runtimeContext?.get?.("resourceId") as string;

      const stream = await planAgent.streamVNext([
        {
          role: 'user',
          content: userFeedback,
          id: crypto.randomUUID(),
          createdAt: new Date()
        }
      ], {
        memory: { thread: threadId, resource: resourceId }
      });

      writer.write({
        type: 'data-status',
        data: { status: 'streaming' },
        id: threadId
      });

      // ストリーミング結果を直接APIに送信
      for await (const chunk of stream.fullStream) {
        // console.log('Agent chunk:', chunk);
        if (chunk.type === 'text-delta') {
          const text = (chunk as { payload: { text: string } }).payload?.text;
          writer.write({
            type: 'text-delta',
            delta: text,
            id: threadId
          });
        } else if (chunk.type === 'tool-call') {
          // ツール実行開始を検出
        } else if (chunk.type === 'tool-result') {
          // ツール実行完了を検出
          console.log(`✅ Tool result received`);
        }
      }

      // 最終結果を取得
      const finalText = await stream.text;

      // 計画内容をメモリに保存
      await updateContextWorkingMemory(threadId, resourceId, {
        planData: {
          status: 'planned',
          plan: finalText,
          workflowName: 'planWorkflow',
        }
      });

      return {
        result: finalText,
        success: true,
      };
    } catch (error) {
      console.error('Default workflow error:', error);

      return {
        result: `申し訳ございません。エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
        success: false,
      };
    }
  }
})

export const planWorkflow = createWorkflow({
  id: "planWorkflow",
  inputSchema: inputWorkflowInputSchema,
  outputSchema: outputWorkflowOutputSchema,
  steps: [planWorkflowStep]
}).then(planWorkflowStep).commit();