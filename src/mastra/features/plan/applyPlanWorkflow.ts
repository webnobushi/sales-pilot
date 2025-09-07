import { contextMemorySchema } from "@/mastra/core/contextDefinitions";
import { resetContextWorkingMemory } from "@/mastra/util";
import { createStep, createWorkflow } from "@mastra/core";
import z from "zod";

const inputWorkflowInputSchema = z.object({
  contextMemory: contextMemorySchema,
});

const outputWorkflowOutputSchema = z.object({
  result: z.string().describe("計画された内容"),
  success: z.boolean(),
});

const applyPlanWorkflowStep = createStep({
  id: "apply-plan-workflow-step",
  inputSchema: inputWorkflowInputSchema,
  outputSchema: outputWorkflowOutputSchema,
  execute: async ({ inputData, runtimeContext, writer, }) => {
    console.log('✅ applyPlanWorkflowStepを実行します');
    try {
      const { contextMemory } = inputData;
      const threadId = runtimeContext?.get?.("threadId") as string;
      const resourceId = runtimeContext?.get?.("resourceId") as string;

      // todo ここは本来はエージェントやツールを呼び出す。
      const finalText = contextMemory.planData.plan;

      // メモリを更新
      await resetContextWorkingMemory(threadId, resourceId);

      writer.write({
        type: 'text-delta',
        delta: `${finalText}を実行しました`,
        id: threadId
      });

      return {
        result: `${finalText}を実行しました`,
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

export const applyPlanWorkflow = createWorkflow({
  id: "applyPlanWorkflow",
  inputSchema: inputWorkflowInputSchema,
  outputSchema: outputWorkflowOutputSchema,
  steps: [applyPlanWorkflowStep]
}).then(applyPlanWorkflowStep).commit();