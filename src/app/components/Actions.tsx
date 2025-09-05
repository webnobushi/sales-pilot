import { ContextMemory } from "@/mastra/core/contextDefinitions"
import { ActionDefinition } from "@/mastra/core/workflowDefinitions"
import { frontActionDefinition } from "@/mastra/features/front/frontDefinition"
import { planActionDefinition } from "@/mastra/features/plan/planDefinition"
import { listDataActionDefinition } from "@/mastra/features/list-data/listDataDefinition"

export type Action = ActionDefinition['actions'][number];

type ActionsProps = {
  context: ContextMemory | null;
  onClick: (action: Action) => Promise<void>;
};

const actionDefinitions: Record<string, ActionDefinition> = {
  front: frontActionDefinition,
  plan: planActionDefinition,
  list: listDataActionDefinition,
}

export const Actions = ({ context, onClick }: ActionsProps) => {
  const actionDefinition = actionDefinitions[context?.currentContext as keyof typeof actionDefinitions]

  if (!actionDefinition || !context) {
    return null;
  }

  const availableActions = actionDefinition.actions.filter(action => action.canExecute(context));

  const handleActionClick = async (action: Action) => {
    try {
      await onClick(action);
    } catch (error) {
      console.error('アクション実行エラー:', error);
    }
  };

  if (availableActions.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {availableActions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleActionClick(action)}
            className="p-4 cursor-pointer bg-white text-black border rounded-lg transition-colors text-left"
          >
            <h4 className="text-sm">
              {typeof action.label === 'string' ? action.label : action.label({})}
            </h4>
          </button>
        ))}
      </div>
    </div>
  )
}