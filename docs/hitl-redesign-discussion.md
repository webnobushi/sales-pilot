# HITL再設計に関する議論まとめ

## 背景・問題点

### 現在の問題
- `resume`後に`execute`の引数で受け取ったwriterがクローズしてしまい、書き込めない
- `UIMessageStreamWriter`を自分で生成したいが、複雑な実装が必要
- AI SDK v5でワークフローのストリーミングができるようになった

### 技術的な課題
- `resume`処理では、MastraのStep内で`writer`が正しく設定されない
- `watch-v2`を使っても、`resume`自体は非ストリーミングなので解決できない
- `Controller is already closed`エラーが発生

## 解決策の検討

### 選択肢1: resume/suspendを使わずにストリーミングを実現
**メリット**:
- ストリーミングが確実に動作
- 複雑な`watch-v2`の設定が不要
- エラーが発生しにくい
- UIの体験が一貫している

**デメリット**:
- 途中のstepから再開できない
- ユーザーの選択やフィードバックを機能が失われる
- ワークフローの柔軟性が低下

**実装方法**:
```typescript
// 新しいワークフロー実行でストリーミング
const newRun = await workflow.createRunAsync();
const stream = newRun.streamVNext({
  inputData: {
    userInput: lastMessage.parts.find(part => part.type === 'text')?.text || '',
    previousContext: resumeData, // 前回のコンテキスト
    resumeChoice: resumeData.resumeData.choice, // ユーザーの選択
    resumeFeedback: resumeData.resumeData.feedback // ユーザーのフィードバック
  },
});
```

### 選択肢2: resume/suspendをちゃんと使ってストリーミングを諦める
**メリット**:
- 途中のstepから正確に再開
- ワークフローの状態を完全に保持
- ユーザーの選択やフィードバックを適切に処理

**デメリット**:
- ストリーミングができない
- UIの体験が一貫しない
- 結果を待つ必要がある

## 新しいアプローチ: エージェントベースHITL

### 基本コンセプト
- **HITLは、ワークフロー開始前のエージェントとの通常会話で既に完了**
- **ワークフロー内では、HITLは発生しない**
- **ワークフロー開始時点で、もう会話は終わっている状態**

### 実装イメージ
```typescript
// エージェントが選択肢を提示
const agentResponse = await agent.generate([
  { role: "user", content: userInput }
]);

// 選択肢を生成してワーキングメモリに保存
const choices = ["オプションA", "オプションB", "オプションC"];
await mastra.memory.set("availableChoices", choices);
await mastra.memory.set("waitingForChoice", true);

// ユーザーに選択肢を提示
return {
  message: `以下の選択肢から選んでください：\n${choices.join('\n')}`,
  type: "choice_prompt"
};
```

### ユーザーの選択後
```typescript
// ユーザーが選択したら
if (userChoice && mastra.memory.get("waitingForChoice")) {
  // 選択をワーキングメモリに保存
  await mastra.memory.set("userChoice", userChoice);
  await mastra.memory.set("waitingForChoice", false);
  
  // ワークフローを開始
  const workflow = mastra.getWorkflow("defaultWorkflow");
  const run = await workflow.createRunAsync();
  const stream = run.streamVNext({
    inputData: {
      userChoice: userChoice,
      // その他の必要なデータ
    }
  });
}
```

## 検討をさらに進めた設計

### 計画データのメモリ管理
- **計画したものもメモリに入れておく**
- **それを元にフィードバック出来るようにする**
- **メッセージとしても保存される**
- **フィードバックは自然の会話で行う**
- **計画ワークフローを裏で動かしておいてそれを保持しておく**

### 処理の流れ
1. **フロントエージェントと会話**
2. **ユーザへ応答**
3. **メモリ更新される**
4. **メモリ取得api実行**
5. **条件が揃ったらアクションUI表示**
6. **アクションを実行するとワークフローが実行され、ストリーミングでレスポンス**
7. **実行状況のメモリ更新（手動？）**

### ワークフローとエージェントの分離
**ワークフロー**:
- **計画**（plan）
- **実行**（execute）

**エージェント**:
- **ユーザフロントのコンテキスト管理**（フロントエージェント）
- **計画エージェント**（ワークフロー内部）
- **実行エージェント**（ワークフロー内部）

### 文脈記憶定義
```typescript
export const contextMemorySchema = z.object({
  // 必要な情報リスト（LLMが判定）
  requiredInfoList: z.array(z.object({
    type: z.string(),
    description: z.string(),
    status: z.enum(["pending", "collected", "not_needed"]),
    source: z.string().optional()
  })),
  
  // 現在の情報リスト（LLMが判定）
  currentInfoList: z.array(z.object({
    type: z.string(),
    value: z.any(),
    timestamp: z.date(),
    source: z.string()
  })),
  
  // 計画データ（手動更新）
  planData: z.object({
    status: z.enum(["none", "planning", "planned", "executing", "completed"]),
    plan: z.any().optional(),
    feedback: z.array(z.string()).default([]),
    lastUpdated: z.date().optional()
  }).default({ status: "none", feedback: [] }),
  
  // 現在の実行可能なアクションデータの構築（手動更新）
  // アクション定義と必要な情報リストを見て構築する
  availableActions: z.array(z.object({
    id: z.string(),
    type: z.enum([
      "plan",      // 計画（plan）
      "apply",     // 計画を本実行(apply)
      "cancel",    // 文脈クリア（cancel）
      "selector"   // 選択肢の選択リスト（セレクタのオプション）
    ]),
    label: z.string(),
    description: z.string(),
    enabled: z.boolean(),
    requiredInfo: z.array(z.string()),
    workflowName: z.string().optional(),
    handler: z.string().optional()
  }))
});
```

#### 文脈記憶の具体例

**例1: プロジェクト計画の作成**
```typescript
// 必要な情報リスト
requiredInfoList: [
  {
    type: "project_list",
    description: "現在のプロジェクト一覧",
    status: "collected",
    source: "project_api"
  },
  {
    type: "user_preferences",
    description: "ユーザーの優先設定",
    status: "pending",
    source: "user_profile"
  },
  {
    type: "business_goals",
    description: "ビジネス目標",
    status: "collected",
    source: "conversation_history"
  }
]

// 現在の情報リスト
currentInfoList: [
  {
    type: "project_list",
    value: [
      { id: "proj-001", name: "Webサイトリニューアル", status: "active" },
      { id: "proj-002", name: "モバイルアプリ開発", status: "planning" }
    ],
    timestamp: new Date("2024-01-15T10:00:00Z"),
    source: "project_api"
  },
  {
    type: "business_goals",
    value: "Q1で売上20%向上、顧客満足度向上",
    timestamp: new Date("2024-01-15T09:30:00Z"),
    source: "conversation_history"
  }
]

// 計画データ
planData: {
  status: "planned",
  plan: {
    priority: "high",
    timeline: "Q1完了",
    resources: ["開発チーム", "デザインチーム"],
    milestones: [
      { phase: "設計", duration: "2週間" },
      { phase: "開発", duration: "6週間" },
      { phase: "テスト", duration: "2週間" }
    ]
  },
  feedback: ["スケジュールが厳しすぎる", "リソース配分を見直して"],
  lastUpdated: new Date("2024-01-15T11:00:00Z")
}

// 利用可能なアクション
availableActions: [
  {
    id: "plan-001",
    type: "plan",
    label: "計画を作成",
    description: "現在の情報を基にプロジェクト計画を作成",
    enabled: true,
    requiredInfo: ["project_list", "business_goals"],
    workflowName: "planWorkflow"
  },
  {
    id: "apply-001",
    type: "apply",
    label: "計画を実行",
    description: "作成された計画を実行に移す",
    enabled: true,
    requiredInfo: ["project_list", "business_goals", "plan"],
    workflowName: "executeWorkflow"
  },
  {
    id: "selector-001",
    type: "selector",
    label: "プロジェクト選択",
    description: "対象プロジェクトを選択",
    enabled: true,
    requiredInfo: ["project_list"],
    handler: "project_selector_handler"
  }
]
```

**例2: 営業活動の最適化**
```typescript
// 必要な情報リスト
requiredInfoList: [
  {
    type: "lead_data",
    description: "リード情報と接触履歴",
    status: "collected",
    source: "crm_system"
  },
  {
    type: "sales_performance",
    description: "過去の営業実績",
    status: "collected",
    source: "sales_dashboard"
  },
  {
    type: "market_trends",
    description: "市場動向と競合情報",
    status: "pending",
    source: "market_research"
  }
]

// 現在の情報リスト
currentInfoList: [
  {
    type: "lead_data",
    value: {
      total_leads: 150,
      qualified_leads: 45,
      conversion_rate: 0.3,
      avg_deal_size: 50000
    },
    timestamp: new Date("2024-01-15T14:00:00Z"),
    source: "crm_system"
  },
  {
    type: "sales_performance",
    value: {
      monthly_target: 1000000,
      current_achievement: 750000,
      top_performers: ["田中", "佐藤", "鈴木"]
    },
    timestamp: new Date("2024-01-15T13:30:00Z"),
    source: "sales_dashboard"
  }
]

// 計画データ
planData: {
  status: "planning",
  plan: null,
  feedback: [],
  lastUpdated: new Date("2024-01-15T14:30:00Z")
}

// 利用可能なアクション
availableActions: [
  {
    id: "plan-002",
    type: "plan",
    label: "営業戦略を計画",
    description: "リードデータと実績を基に営業戦略を策定",
    enabled: false, // 市場動向が未収集のため無効
    requiredInfo: ["lead_data", "sales_performance", "market_trends"],
    workflowName: "salesPlanWorkflow"
  },
  {
    id: "selector-002",
    type: "selector",
    label: "リード優先度設定",
    description: "リードの優先度を設定・並び替え",
    enabled: true,
    requiredInfo: ["lead_data"],
    handler: "lead_priority_handler"
  }
]
```

### アクション定義内容（ワークフローと1:1）
```typescript
// アクション定義の型定義
export type ActionDefinition = {
  // 計画に必要な情報の蓄積状況
  requiredInfoStatus: {
    infoTypes: string[];
    collectedCount: number;
    totalCount: number;
  };
  
  // 計画済みデータ（実行待ちデータ）
  plannedData?: any;
  
  // ワークフロー同士の関連性管理
  workflowDependencies: {
    workflowName: string;
    dependsOn: string[]; // 依存するワークフロー名の配列
    requiredStatus: {
      workflowName: string; // 対象のワークフロー名
      status: string; // 必要なステータス
      description: string; // ステータスの説明
    }[]; // 依存ワークフローに必要なステータス
    description: string; // 依存関係の説明
  }[];
  
  // 全アクション定義（各ワークフロー実行に必要な情報）
  actions: {
    name: string;
    workflowName: string;
    actionHandler: string; // 自由フォーマットで何でも定義可能にする
    requiredInfo: {
      infoTypes: string[]; // 必要な情報の種類
      description: string; // 情報の説明
      optional: boolean; // オプションかどうか
    }[];
    immediateExecution: boolean; // 即時実行する処理かどうか
    dependencies?: string[]; // 依存するアクション名の配列
  }[];
};
```

#### アクション定義の具体例

**例1: プロジェクト管理ワークフロー**
```typescript
const projectManagementActions = {
  requiredInfoStatus: {
    infoTypes: ["project_list", "user_preferences", "business_goals", "resource_availability"],
    collectedCount: 2,
    totalCount: 4
  },
  
  plannedData: {
    project_plan: {
      id: "plan-2024-001",
      name: "Q1プロジェクト計画",
      status: "draft",
      created_at: "2024-01-15T10:00:00Z"
    }
  },
  
  // ワークフロー同士の関連性管理
  workflowDependencies: [
    {
      workflowName: "projectExecuteWorkflow",
      dependsOn: ["projectPlanWorkflow"],
      requiredStatus: [
        {
          workflowName: "projectPlanWorkflow",
          status: "completed",
          description: "プロジェクト計画が完了していること"
        }
      ],
      description: "計画ワークフローが完了してから実行ワークフローを開始"
    }
  ],
  
  actions: [
    {
      name: "プロジェクト計画作成",
      workflowName: "projectPlanWorkflow",
      actionHandler: "create_project_plan",
      requiredInfo: [
        {
          infoTypes: ["project_list"],
          description: "現在のプロジェクト一覧",
          optional: false
        },
        {
          infoTypes: ["business_goals"],
          description: "ビジネス目標",
          optional: false
        }
      ],
      immediateExecution: false
    },
    {
      name: "計画実行",
      workflowName: "projectExecuteWorkflow",
      actionHandler: "execute_project_plan",
      requiredInfo: [
        {
          infoTypes: ["project_list", "business_goals"],
          description: "プロジェクト一覧とビジネス目標",
          optional: false
        },
        {
          infoTypes: ["project_plan"],
          description: "作成済みのプロジェクト計画",
          optional: false
        },
        {
          infoTypes: ["resource_availability"],
          description: "リソースの利用可能性",
          optional: false
        }
      ],
      immediateExecution: false,
      dependencies: ["プロジェクト計画作成"] // 計画作成が完了してから実行可能
    },
    {
      name: "プロジェクト一覧取得",
      workflowName: "projectListWorkflow",
      actionHandler: "fetch_project_list",
      requiredInfo: [], // 情報が不要な即時実行アクション
      immediateExecution: true // 即座に実行可能
    },
    {
      name: "リソース状況確認",
      workflowName: "resourceCheckWorkflow",
      actionHandler: "check_resource_availability",
      requiredInfo: [
        {
          infoTypes: ["project_list"],
          description: "対象プロジェクト一覧",
          optional: false
        }
      ],
      immediateExecution: true
    }
  ]
};
```

**例2: 営業最適化ワークフロー**
```typescript
const salesOptimizationActions = {
  requiredInfoStatus: {
    infoTypes: ["lead_data", "sales_performance", "market_trends", "customer_feedback"],
    collectedCount: 3,
    totalCount: 4
  },
  
  plannedData: {
    sales_strategy: {
      id: "strategy-2024-001",
      name: "Q1営業戦略",
      status: "approved",
      approved_at: "2024-01-15T15:00:00Z"
    }
  },
  
  actions: [
    {
      name: "営業戦略策定",
      workflowName: "salesStrategyWorkflow",
      actionHandler: "create_sales_strategy",
      requiredInfo: ["lead_data", "sales_performance", "market_trends"],
      immediateExecution: false
    },
    {
      name: "戦略実行",
      workflowName: "salesExecutionWorkflow",
      actionHandler: "execute_sales_strategy",
      requiredInfo: ["lead_data", "sales_performance", "market_trends", "sales_strategy"],
      immediateExecution: false
    },
    {
      name: "リード分析",
      workflowName: "leadAnalysisWorkflow",
      actionHandler: "analyze_leads",
      requiredInfo: ["lead_data"],
      immediateExecution: true
    },
    {
      name: "パフォーマンスレポート生成",
      workflowName: "performanceReportWorkflow",
      actionHandler: "generate_performance_report",
      requiredInfo: ["sales_performance", "customer_feedback"],
      immediateExecution: true
    }
  ]
};
```

**例3: 即時実行アクションの例**
```typescript
const immediateActions = {
  requiredInfoStatus: {
    infoTypes: ["user_query"],
    collectedCount: 1,
    totalCount: 1
  },
  
  plannedData: null,
  
  actions: [
    {
      name: "FAQ回答",
      workflowName: "faqWorkflow",
      actionHandler: "answer_faq",
      requiredInfo: ["user_query"],
      immediateExecution: true // ユーザーの質問に対して即座に回答
    },
    {
      name: "データ検索",
      workflowName: "dataSearchWorkflow",
      actionHandler: "search_data",
      requiredInfo: ["user_query"],
      immediateExecution: true // 検索クエリに対して即座に結果を返す
    },
    {
      name: "計算処理",
      workflowName: "calculationWorkflow",
      actionHandler: "perform_calculation",
      requiredInfo: ["user_query"],
      immediateExecution: true // 数式や計算要求に対して即座に結果を返す
    }
  ]
};
```

### 即時実行のワークフローの動き（HITL無関係に元々考慮していたところ）
- **バックエンドの中でエージェントを切り替えるパターン**
- **メモリの更新も動的に行った上で条件が揃っていたら定義の通りワークフロー実行**
- **揃っていなかったらレスポンスを返す**

**例：プロジェクト状況を見たい**
1. プロジェクト一覧が必要
2. 一覧取得ハンドラが実行される
3. メモリを更新してアクションリストを更新
4. フロントにエージェント任せで応答させる

### 現在の実行可能なアクションの管理方法
- **ワークフロー同士で関連性のあるもの**
- **計画と実行の２つのワークフロー**
- **計画が終わってないと実行ができない**
- **これもアクション定義内容に必要な情報として管理**

## contextAgentの拡張

### 拡張の方向性
- **HITL選択肢の生成**
- **選択肢の状態管理**
- **ユーザーの選択待ち状態の管理**

### 実装内容
```typescript
const instructions = `あなたは営業管理の専門家です。

## 重要: メモリスキーマでの定義
以下の情報をメモリに定義してください：

### 必要な処理の定義
- requiredActions: 実行が必要な処理の配列
  - type: "fetch_projects" | "get_user_info" | "generate_choices"
  - description: 処理の説明
  - parameters: 必要なパラメータ
  - priority: 優先度

### 選択肢生成のための情報
- choiceContext: 選択肢生成に必要な情報
  - dataType: "projects" | "users" | "custom"
  - source: "api" | "database" | "generated"
  - filters: フィルタ条件
  - maxItems: 最大表示件数

## 応答方針
1. ユーザーの要望を理解
2. **何をする必要があるか**をメモリに定義
3. **具体的な処理は行わない**（API呼び出しなど）
4. 必要な情報が揃ったら選択肢を提示

## 注意事項
- API呼び出しやデータベースアクセスは行わない
- 必要な処理の定義のみを行う
- 具体的な実行は別システムに委譲`;
```

## メモリスキーマ

### 基本スキーマ
```typescript
export const defaultWorkingMemorySchema = z.object({
  // 必要な処理の定義
  requiredActions: z.array(z.object({
    type: z.enum(["fetch_projects", "get_user_info", "generate_choices"]),
    description: z.string(),
    parameters: z.record(z.any()),
    priority: z.number().min(1).max(5)
  })).default([]),
  
  // 選択肢生成のための情報
  choiceContext: z.object({
    dataType: z.enum(["projects", "users", "custom"]),
    source: z.enum(["api", "database", "generated"]),
    filters: z.record(z.any()).optional(),
    maxItems: z.number().optional()
  }).optional(),
  
  // 選択肢の状態
  hitlState: z.object({
    status: z.enum(["waiting", "completed", "none"]),
    waitingFor: z.string().optional()
  }).default({ status: "none" })
});
```

### 簡略化されたスキーマ
```typescript
const defaultWorkingMemorySchema = z.object({
  agent: z.enum(['listDataAgent', 'planAgent', 'none']),
});
```



## デメリット・落とし穴

### 1. 速度の問題
- **メモリアクセス**: ワーキングメモリへの読み書きが増加
- **JSON処理**: 毎回の会話でスキーマ検証とJSON変換
- **LLM呼び出し**: 選択肢生成のたびにLLMを呼び出し

### 2. 複雑性の増加
- **状態管理**: HITL状態の管理が複雑になる
- **エラーハンドリング**: メモリ更新失敗時の処理
- **一貫性**: メモリと実際の状態の同期

### 3. ユーザー体験の悪化
- **待ち時間**: 選択肢生成のたびにLLM呼び出し
- **不自然**: 会話の流れが途切れる可能性
- **混乱**: 選択肢が多すぎたり、適切でない場合

### 4. 技術的な落とし穴
- **メモリリーク**: 古い選択肢や状態が蓄積
- **スキーマ変更**: メモリ構造の変更時の互換性
- **デバッグ困難**: メモリ状態の追跡が困難

## 最適化の方向性

### 動的選択肢構築の要件
- **動的な選択肢構築**が必要
- **APIを叩いて一覧を取得**などの処理が発生
- **エージェントにやらせると遅い**ので、**何をする必要があるかだけをメモリのスキーマに定義**
- **具体的な処理は別の場所で実行**

### 軽量化のアプローチ
- **メモリの処理が重くなる場合は、別のエージェントに判定させる**
- **メモリを手動更新**する
- **contextAgentは軽量に保つ**

## 課題と検討事項

### 選択肢の動的取得をどうするか
- **あらかじめデータ取得しておくのが良さそう**
- **必要な情報ごとにフックのハンドラを定義できるようにしておく**
- **例：プロジェクト一覧**

#### ハンドラ定義の例
```typescript
// ハンドラの型定義
export type InfoHandler = {
  name: string;
  description: string;
  handler: (params: any) => Promise<any>;
  requiredParams?: string[];
  cacheDuration?: number; // キャッシュの有効期間（秒）
};

// ハンドラの実装例
export const infoHandlers: Record<string, InfoHandler> = {
  // プロジェクト一覧取得ハンドラ
  "fetch_projects": {
    name: "プロジェクト一覧取得",
    description: "現在のプロジェクト一覧を取得",
    handler: async (params: { status?: string; limit?: number }) => {
      // 実際のAPI呼び出しやデータベースアクセス
      const projects = await fetchProjects(params);
      return projects;
    },
    requiredParams: [],
    cacheDuration: 300 // 5分間キャッシュ
  },
  
  // ユーザー情報取得ハンドラ
  "fetch_user_info": {
    name: "ユーザー情報取得",
    description: "指定されたユーザーの詳細情報を取得",
    handler: async (params: { userId: string }) => {
      const userInfo = await fetchUserInfo(params.userId);
      return userInfo;
    },
    requiredParams: ["userId"],
    cacheDuration: 600 // 10分間キャッシュ
  },
  
  // 営業実績取得ハンドラ
  "fetch_sales_performance": {
    name: "営業実績取得",
    description: "指定期間の営業実績を取得",
    handler: async (params: { startDate: string; endDate: string }) => {
      const performance = await fetchSalesPerformance(params.startDate, params.endDate);
      return performance;
    },
    requiredParams: ["startDate", "endDate"],
    cacheDuration: 1800 // 30分間キャッシュ
  },
  
  // 市場動向取得ハンドラ
  "fetch_market_trends": {
    name: "市場動向取得",
    description: "最新の市場動向と競合情報を取得",
    handler: async (params: { industry?: string; region?: string }) => {
      const trends = await fetchMarketTrends(params);
      return trends;
    },
    requiredParams: [],
    cacheDuration: 3600 // 1時間キャッシュ
  }
};

// ハンドラ実行関数
export async function executeHandler(
  handlerName: string, 
  params: any
): Promise<any> {
  const handler = infoHandlers[handlerName];
  if (!handler) {
    throw new Error(`Handler not found: ${handlerName}`);
  }
  
  // 必須パラメータのチェック
  if (handler.requiredParams) {
    for (const param of handler.requiredParams) {
      if (!(param in params)) {
        throw new Error(`Required parameter missing: ${param}`);
      }
    }
  }
  
  // ハンドラを実行
  return await handler.handler(params);
}
```

### 文脈をリセットするタイミングとリセット範囲
- **同時に複数のワークフローの条件が揃うこともある**
- **一つのワークフローの処理が終わったら一度そのワークフローに関するデータだけ削除する**
- **入力データが不要なフロントエージェントが判定しただけで実行可能なもの（FAQ的な指示）**
- **これはワークフローにしなくて良い。文脈エージェントが回答すれば良い**

### エージェントにやらせると遅いのでワークフローの処理の中でマニュアルで更新をかければ良い
- **現在の状況に応じて選択肢を制御**
- **ワークフロー処理内でメモリを手動更新**
- **条件が揃ったらアクションUI表示**

## 次のステップ

1. **HITL再設計の方向性を決定**
2. **エージェントベースHITLの詳細設計**
3. **メモリスキーマの最適化**
4. **判定システムの実装**
5. **パフォーマンステストと調整**
6. **文脈記憶定義の実装**
7. **アクション定義システムの構築**
8. **ワークフローとエージェントの分離設計**

## 結論

現在の`resume/suspend`ベースのHITLは技術的な課題が多いため、**エージェントベースHITL**への移行が推奨される。ただし、パフォーマンスと複雑性のバランスを考慮した設計が必要。

**新しい設計のポイント**:
- 計画データをメモリに保持し、フィードバック可能にする
- 自然な会話でフィードバックを行う
- ワークフローを裏で動かして結果を保持
- 文脈記憶で必要な情報と現在の情報を管理
- アクション定義でワークフロー実行に必要な情報を管理
- エージェントは軽量に保ち、重い処理はワークフロー内で手動更新
