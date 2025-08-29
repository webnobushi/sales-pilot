// パフォーマンス測定用のユーティリティ

export type PerformanceMetrics = {
  toolName?: string;
  totalTime: number;
  toolExecutionTime: number;
  responseGenerationTime: number;
  timestamp: string;
};

export class PerformanceTracker {
  private startTime: number;
  private toolStartTime?: number;
  private responseStartTime?: number;

  constructor() {
    this.startTime = Date.now();
  }

  startToolExecution() {
    this.toolStartTime = Date.now();
  }

  endToolExecution() {
    if (!this.toolStartTime) {
      throw new Error('Tool execution was not started');
    }
    const toolExecutionTime = Date.now() - this.toolStartTime;
    this.toolStartTime = undefined;
    return toolExecutionTime;
  }

  startResponseGeneration() {
    this.responseStartTime = Date.now();
  }

  endResponseGeneration() {
    if (!this.responseStartTime) {
      throw new Error('Response generation was not started');
    }
    const responseGenerationTime = Date.now() - this.responseStartTime;
    this.responseStartTime = undefined;
    return responseGenerationTime;
  }

  getMetrics(toolName?: string): PerformanceMetrics {
    const totalTime = Date.now() - this.startTime;
    return {
      toolName,
      totalTime,
      toolExecutionTime: 0, // ツール実行時間は別途設定
      responseGenerationTime: 0, // 応答生成時間は別途設定
      timestamp: new Date().toISOString(),
    };
  }
}

// グローバルなパフォーマンスログ
export const performanceLog: PerformanceMetrics[] = [];

export function logPerformance(metrics: PerformanceMetrics) {
  performanceLog.push(metrics);
  console.log(`📈 Performance logged: ${metrics.toolName || 'No tool'} - Total: ${metrics.totalTime}ms`);
}

export function getPerformanceSummary() {
  if (performanceLog.length === 0) {
    return "No performance data available";
  }

  const toolStats = new Map<string, { count: number; totalTime: number; totalToolTime: number; totalResponseTime: number }>();

  performanceLog.forEach(metric => {
    const toolName = metric.toolName || 'No tool';
    const current = toolStats.get(toolName) || { count: 0, totalTime: 0, totalToolTime: 0, totalResponseTime: 0 };

    toolStats.set(toolName, {
      count: current.count + 1,
      totalTime: current.totalTime + metric.totalTime,
      totalToolTime: current.totalToolTime + metric.toolExecutionTime,
      totalResponseTime: current.totalResponseTime + metric.responseGenerationTime
    });
  });

  let summary = "Performance Summary:\n\n";

  toolStats.forEach((stats, toolName) => {
    const avgTotal = Math.round(stats.totalTime / stats.count);
    const avgTool = Math.round(stats.totalToolTime / stats.count);
    const avgResponse = Math.round(stats.totalResponseTime / stats.count);

    summary += `${toolName}\n`;
    summary += `  実行回数: ${stats.count}\n`;
    summary += `  総時間: ${stats.totalTime}ms (平均: ${avgTotal}ms)\n`;
    summary += `  ツール時間: ${stats.totalToolTime}ms (平均: ${avgTool}ms)\n`;
    summary += `  応答時間: ${stats.totalResponseTime}ms (平均: ${avgResponse}ms)\n\n`;
  });

  return summary;
}

export function clearPerformanceLog() {
  performanceLog.length = 0;
  console.log('📊 Performance log cleared');
}
