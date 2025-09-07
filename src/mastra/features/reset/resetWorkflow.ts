import { planAgent } from "@/mastra/features/plan/planAgent";
import { resetContextWorkingMemory } from "@/mastra/util";
import { createStep, createWorkflow } from "@mastra/core";
import z from "zod";

const inputWorkflowInputSchema = z.object({});

const outputWorkflowOutputSchema = z.object({
  success: z.boolean(),
});

const resetContextWorkflowStep = createStep({
  id: "reset-context-step",
  inputSchema: inputWorkflowInputSchema,
  outputSchema: outputWorkflowOutputSchema,
  execute: async ({ runtimeContext, writer,  }) => {
    try {
      const threadId = runtimeContext?.get?.("threadId") as string;
      const resourceId = runtimeContext?.get?.("resourceId") as string;

      await resetContextWorkingMemory(threadId, resourceId);

      writer.write({
        type: 'text-delta',
        delta: '計画を中止しました',
        id: threadId
      });
      
      return {
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

export const resetContextWorkflow = createWorkflow({
  id: "resetContextWorkflow",
  inputSchema: inputWorkflowInputSchema,
  outputSchema: outputWorkflowOutputSchema,
  steps: [resetContextWorkflowStep]
}).then(resetContextWorkflowStep).commit();