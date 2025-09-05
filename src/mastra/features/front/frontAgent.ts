import { openai } from "@ai-sdk/openai";
import { Agent, AgentConfig } from "@mastra/core/agent";
import { generatePlanInstructions, } from "@/mastra/features/plan/planDefinition";
import { generateListDataInstructions } from "@/mastra/features/list-data/listDataDefinition";
import { generateFrontInstructions } from "@/mastra/features/front/frontDefinition";
import { CommonWorkingMemory } from "@/mastra/core/contextDefinitions";
import { contextMemory } from "@/mastra/core/contextMemory";

const agentConfig: AgentConfig = {
  name: "FrontAgent",
  model: openai('gpt-4o-mini'),
  defaultGenerateOptions: {
    temperature: 0,
  },
  instructions: ({ runtimeContext }) => {
    // 現在の会話内容に基づいて指示を動的に生成
    console.log('runtimeContext:', runtimeContext);
    const currentContext = runtimeContext.get('currentContext') as CommonWorkingMemory["currentContext"];

    console.log('currentContext:', currentContext);
    // 話題別の指示定義
    const contextInstructions = {
      front: generateFrontInstructions(),
      plan: generatePlanInstructions(),
      list: generateListDataInstructions(),
    }

    // currentAgentに基づいて指示を選択
    const instructions = contextInstructions[currentContext as keyof typeof contextInstructions] || contextInstructions.front;
    console.log('instructions:', instructions);
    return instructions;
  },
  memory: contextMemory,
};

export const frontAgent = new Agent(agentConfig);
