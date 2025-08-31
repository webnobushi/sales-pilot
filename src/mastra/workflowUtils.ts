import { workflowDefinitions, WorkflowDefinition, searchWorkflowsByKeywords } from './workflowDefinitions';

// ユーザーの入力からワークフローを検出する関数
export function detectWorkflowsFromUserInput(userInput: string): {
  workflows: WorkflowDefinition[];
  confidence: number;
  missingData: string[];
} {
  const keywords = userInput.toLowerCase().split(/\s+/);
  const matchedWorkflows = searchWorkflowsByKeywords(keywords);

  if (matchedWorkflows.length === 0) {
    return {
      workflows: [],
      confidence: 0,
      missingData: []
    };
  }

  // 最もマッチ度の高いワークフローを選択
  const bestMatch = matchedWorkflows.reduce((best, current) => {
    const currentConfidence = current.triggers.reduce((max, trigger) => {
      const matchCount = trigger.keywords.filter(keyword =>
        keywords.some(k => k.includes(keyword.toLowerCase()))
      ).length;
      return Math.max(max, (matchCount / trigger.keywords.length) * trigger.confidence);
    }, 0);

    return currentConfidence > best.confidence ? { workflow: current, confidence: currentConfidence } : best;
  }, { workflow: matchedWorkflows[0], confidence: 0 });

  // 不足しているデータを特定
  const missingData = bestMatch.workflow.requiredData
    .filter(data => !userInput.toLowerCase().includes(data.key.toLowerCase()))
    .map(data => data.label);

  return {
    workflows: [bestMatch.workflow],
    confidence: bestMatch.confidence,
    missingData
  };
}

// ワークフローに必要なデータを抽出する関数
export function extractWorkflowData(userInput: string, workflow: WorkflowDefinition): Record<string, any> {
  const extractedData: Record<string, any> = {};

  // 必須データの抽出
  workflow.requiredData.forEach(data => {
    // キーワードベースの抽出（簡易版）
    const patterns = [
      new RegExp(`${data.key}[：:]\s*([^\\s]+)`, 'i'),
      new RegExp(`${data.label}[：:]\s*([^\\s]+)`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = userInput.match(pattern);
      if (match) {
        extractedData[data.key] = match[1];
        break;
      }
    }
  });

  // オプションデータの抽出
  workflow.optionalData?.forEach(data => {
    const patterns = [
      new RegExp(`${data.key}[：:]\s*([^\\s]+)`, 'i'),
      new RegExp(`${data.label}[：:]\s*([^\\s]+)`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = userInput.match(pattern);
      if (match) {
        extractedData[data.key] = match[1];
        break;
      }
    }
  });

  return extractedData;
}

// ワークフロー提案メッセージを生成する関数
export function generateWorkflowSuggestionMessage(
  workflow: WorkflowDefinition,
  missingData: string[],
  extractedData: Record<string, any>
): string {
  const hasData = Object.keys(extractedData).length > 0;
  const hasMissingData = missingData.length > 0;

  let message = `${workflow.name}の実行を提案いたします。\n\n`;

  if (hasData) {
    message += `**収集済みデータ:**\n`;
    Object.entries(extractedData).forEach(([key, value]) => {
      const field = workflow.requiredData.find(d => d.key === key) ||
        workflow.optionalData?.find(d => d.key === key);
      if (field) {
        message += `- ${field.label}: ${value}\n`;
      }
    });
    message += '\n';
  }

  if (hasMissingData) {
    message += `**必要な追加データ:**\n`;
    missingData.forEach(data => {
      message += `- ${data}\n`;
    });
    message += '\n';
  }

  if (!hasMissingData) {
    message += `✅ 必要なデータが揃いました。ワークフローを実行できます。`;
  } else {
    message += `📝 上記の情報をお教えください。`;
  }

  return message;
}

// ワークフロー実行の準備状況をチェックする関数
export function checkWorkflowReadiness(
  workflow: WorkflowDefinition,
  accumulatedData: Record<string, any>
): {
  isReady: boolean;
  missingData: string[];
  readyData: Record<string, any>;
} {
  const missingData: string[] = [];
  const readyData: Record<string, any> = {};

  // 必須データのチェック
  workflow.requiredData.forEach(data => {
    if (accumulatedData[data.key]) {
      readyData[data.key] = accumulatedData[data.key];
    } else {
      missingData.push(data.label);
    }
  });

  // オプションデータの追加
  workflow.optionalData?.forEach(data => {
    if (accumulatedData[data.key]) {
      readyData[data.key] = accumulatedData[data.key];
    }
  });

  return {
    isReady: missingData.length === 0,
    missingData,
    readyData
  };
}
