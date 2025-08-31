import z from 'zod';

// ワークフロー定義のスキーマ
export const workflowDefinitionSchema = z.object({
  id: z.string().describe('ワークフローの一意の識別子'),
  name: z.string().describe('ワークフローの表示名'),
  description: z.string().describe('ワークフローの詳細説明'),
  category: z.string().describe('ワークフローのカテゴリ（planning, analysis, reporting等）'),
  requiredData: z.array(z.object({
    key: z.string().describe('データフィールドのキー名'),
    label: z.string().describe('ユーザーに表示するラベル'),
    type: z.enum(['string', 'number', 'date', 'select']).describe('データの型'),
    required: z.boolean().describe('必須項目かどうか'),
    options: z.array(z.string()).optional().describe('選択肢（typeがselectの場合）'),
    description: z.string().describe('フィールドの説明'),
  })).describe('ワークフロー実行に必要な必須データ'),
  optionalData: z.array(z.object({
    key: z.string().describe('データフィールドのキー名'),
    label: z.string().describe('ユーザーに表示するラベル'),
    type: z.enum(['string', 'number', 'date', 'select']).describe('データの型'),
    options: z.array(z.string()).optional().describe('選択肢（typeがselectの場合）'),
    description: z.string().describe('フィールドの説明'),
  })).optional().describe('ワークフロー実行時のオプションデータ'),
  triggers: z.array(z.object({
    keywords: z.array(z.string()).describe('ワークフローをトリガーするキーワード'),
    intent: z.string().describe('ユーザーの意図'),
    confidence: z.number().min(0).max(1).describe('トリガーの信頼度（0-1）'),
  })).describe('ワークフローをトリガーする条件'),
  immediateExecution: z.boolean().optional().describe('ワークフローを即時実行可能かどうか'),
});

export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>;

// ワークフロー定義データ
export const workflowDefinitions: WorkflowDefinition[] = [
  {
    id: 'test-workflow',
    name: 'テストワークフロー',
    description: 'テストワークフローです',
    category: 'test',
    requiredData: [],
    optionalData: [],
    triggers: [
      {
        keywords: ['テスト', 'ワークフロー'],
        intent: 'テストワークフローを希望',
        confidence: 0.9
      },
    ],
    immediateExecution: true,
  },
  {
    id: 'project-planning',
    name: 'プロジェクト計画作成',
    description: 'プロジェクトの詳細な計画を作成します',
    category: 'planning',
    requiredData: [
      {
        key: 'projectName',
        label: 'プロジェクト名',
        type: 'string',
        required: true,
        description: 'プロジェクトの名称'
      },
      {
        key: 'budget',
        label: '予算',
        type: 'number',
        required: true,
        description: 'プロジェクトの予算（万円）'
      },
      {
        key: 'deadline',
        label: '期限',
        type: 'date',
        required: true,
        description: 'プロジェクトの完了期限'
      },
      {
        key: 'projectType',
        label: 'プロジェクトタイプ',
        type: 'select',
        required: true,
        options: ['新規開発', '保守・運用', '改善・改修', '調査・分析'],
        description: 'プロジェクトの種類'
      },
      {
        key: 'features',
        label: '機能',
        type: 'select',
        required: true,
        options: ['顧客管理', '案件管理', '見積もり管理', 'プロジェクト管理', 'チケット管理', 'タスク管理', 'メモ管理', 'ファイル管理', '連携管理', '設定管理'],
        description: 'プロジェクトの機能'
      }
    ],
    optionalData: [
      {
        key: 'teamSize',
        label: 'チーム規模',
        type: 'number',
        description: 'プロジェクトチームの人数'
      },
      {
        key: 'priority',
        label: '優先度',
        type: 'select',
        options: ['高', '中', '低'],
        description: 'プロジェクトの優先度'
      }
    ],
    triggers: [
      {
        keywords: ['プロジェクト', '計画', '作成', '立ち上げ'],
        intent: 'プロジェクト計画の作成を希望',
        confidence: 0.9
      },
      {
        keywords: ['企画', '設計', '構築'],
        intent: 'プロジェクトの企画・設計を希望',
        confidence: 0.8
      }
    ],
  },
  {
    id: 'data-analysis',
    name: 'データ分析',
    description: '指定されたデータの分析を実行します',
    category: 'analysis',
    requiredData: [
      {
        key: 'dataSource',
        label: 'データソース',
        type: 'string',
        required: true,
        description: '分析対象のデータソース'
      },
      {
        key: 'analysisType',
        label: '分析タイプ',
        type: 'select',
        required: true,
        options: ['売上分析', '顧客分析', 'トレンド分析', '予測分析'],
        description: '実行する分析の種類'
      },
      {
        key: 'period',
        label: '分析期間',
        type: 'string',
        required: true,
        description: '分析対象の期間'
      }
    ],
    triggers: [
      {
        keywords: ['データ', '分析', '解析', '調査'],
        intent: 'データ分析の実行を希望',
        confidence: 0.9
      },
      {
        keywords: ['売上', 'トレンド', '予測'],
        intent: '売上・トレンド分析を希望',
        confidence: 0.8
      }
    ],
    
  },
  {
    id: 'report-generation',
    name: 'レポート生成',
    description: '指定された内容のレポートを生成します',
    category: 'reporting',
    requiredData: [
      {
        key: 'reportType',
        label: 'レポートタイプ',
        type: 'select',
        required: true,
        options: ['月次報告', '四半期報告', '年次報告', '特別報告'],
        description: 'レポートの種類'
      },
      {
        key: 'targetPeriod',
        label: '対象期間',
        type: 'string',
        required: true,
        description: 'レポートの対象期間'
      },
      {
        key: 'department',
        label: '対象部署',
        type: 'string',
        required: true,
        description: 'レポートの対象部署'
      }
    ],
    triggers: [
      {
        keywords: ['レポート', '報告書', 'まとめ'],
        intent: 'レポートの生成を希望',
        confidence: 0.9
      },
      {
        keywords: ['月次', '四半期', '年次'],
        intent: '定期レポートの生成を希望',
        confidence: 0.8
      }
    ],
  }
];