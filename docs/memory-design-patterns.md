# メモリ設計パターン比較

## 概要

Mastraエージェントのメモリ管理における4つの設計パターンの比較と、それぞれのメリット・デメリットをまとめたドキュメントです。

## 1. ストレージ共有 + エージェント固有リソースID

### 実装方法

```typescript
// 共通ストレージ、エージェント固有リソースID
const sharedStorage = new LibSQLStore({ url: "file:./shared.db" });

const frontMemory = new Memory({ storage: sharedStorage });
const planMemory = new Memory({ storage: sharedStorage });

// エージェントごとに異なるリソースID
await frontMemory.updateWorkingMemory({
  threadId: "conversation-1",
  resourceId: "user-123-front",  // エージェント固有
  workingMemory: { ... }
});
```

### メリット

- ✅ メッセージ履歴が共有される
- ✅ ユーザー別履歴保存が可能
- ✅ ストレージファイルが1つで管理しやすい

### デメリット

- ❌ ワーキングメモリが混在する可能性
- ❌ エージェント間で情報が上書きされる
- ❌ スケーラビリティに問題（エージェント増加時）

---

## 2. 完全分離（ストレージ・メモリ・エージェント）

### 実装方法

```typescript
// 各エージェントが完全に独立
const frontMemory = new Memory({ 
  storage: new LibSQLStore({ url: "file:./front.db" }) 
});
const planMemory = new Memory({ 
  storage: new LibSQLStore({ url: "file:./plan.db" }) 
});
```

### メリット

- ✅ ワーキングメモリが完全に分離
- ✅ スケーラビリティが高い
- ✅ エージェント間で干渉しない
- ✅ 速度が速い（無駄な処理なし）

### デメリット

- ❌ メッセージ履歴が分離される
- ❌ エージェント間で文脈共有が困難
- ❌ ストレージファイルが増える
- ❌ 履歴の統合が複雑

---

## 3. 共通メモリインスタンス + 共有スキーマ

### 実装方法

```typescript
// 共通のメモリインスタンス
const sharedMemory = new Memory({
  storage: sharedStorage,
  options: {
    workingMemory: {
      enabled: true,
      schema: sharedSchema, // エージェントごとの情報を含むスキーマ
    },
  },
});

export const frontAgent = new Agent({ memory: sharedMemory });
export const planAgent = new Agent({ memory: sharedMemory });
```

### メリット

- ✅ メッセージ履歴が完全に共有
- ✅ エージェント間で情報共有が容易
- ✅ ワーキングメモリも共有可能

### デメリット

- ❌ ワーキングメモリが混在する
- ❌ スケーラビリティに問題
- ❌ エージェント数増加時に処理が重くなる
- ❌ 無駄な更新処理が発生

---

## 4. 完全分離 + 手動更新

### 実装方法

```typescript
// 各エージェントは独立したメモリ
const frontMemory = new Memory({ storage: frontStorage });
const planMemory = new Memory({ storage: planStorage });

// 必要な時だけ手動更新
await frontMemory.updateWorkingMemory({
  threadId: "conversation-1",
  resourceId: "user-123",
  workingMemory: { agent: "planAgent" }
});
```

### メリット

- ✅ 速度が最速（自動更新なし）
- ✅ ワーキングメモリが完全に分離
- ✅ スケーラビリティが最高
- ✅ 更新タイミングを完全制御
- ✅ エージェント間で干渉しない

### デメリット

- ❌ メッセージ履歴が分離される
- ❌ 手動管理が必要（実装が複雑）
- ❌ ストレージファイルが増える
- ❌ 履歴の統合が困難

---

## 5. runtimeContextを使った動的処理（新規追加）

### 実装方法

```typescript
export const frontAgent = new Agent({
  name: "FrontAgent",
  instructions: ({ runtimeContext }) => {
    // 現在の会話内容に基づいて指示を動的に生成
    const currentTopic = runtimeContext.get("currentTopic");
    const userIntent = runtimeContext.get("userIntent");
    
    if (currentTopic === "sales" || userIntent?.includes("営業")) {
      return `
        あなたは営業戦略の専門家です。
        
        ## 専門分野
        - 営業戦略の立案
        - 顧客分析
        - 競合分析
        - 売上予測
        
        ## メモリ更新ルール
        - 営業関連の情報を詳細に記録
        - 顧客の課題とニーズを記録
        - 具体的なアクションプランを記録
        - 次のステップを明確化
      `;
    }
    
    if (currentTopic === "data" || userIntent?.includes("データ")) {
      return `
        あなたはデータ分析の専門家です。
        
        ## 専門分野
        - データ分析と可視化
        - 統計分析
        - インサイトの抽出
        - レポート作成
      `;
    }
    
    // デフォルトの指示
    return "あなたは汎用的なアシスタントです。";
  },
  
  memory: ({ runtimeContext }) => {
    // 現在の会話内容に基づいてメモリ設定を動的に変更
    const currentTopic = runtimeContext.get("currentTopic");
    
    if (currentTopic === "sales") {
      return new Memory({
        storage: sharedStorage,
        options: {
          workingMemory: {
            enabled: true,
            schema: salesWorkingMemorySchema, // 営業特化スキーマ
          },
        },
      });
    }
    
    // デフォルトのメモリ設定
    return new Memory({
      storage: sharedStorage,
      options: {
        workingMemory: {
          enabled: true,
          schema: defaultWorkingMemorySchema,
        },
      },
    });
  },
  
  model: openai("gpt-4o"),
});
```

### 振り分け処理の実装

```typescript
// 最初の振り分け処理でruntimeContextを設定
const response = await frontAgent.stream("営業戦略について教えて", {
  runtimeContext: {
    currentTopic: "sales",           // トピックを設定
    userIntent: "営業戦略の立案",     // ユーザーの意図
    industry: "IT業界",              // 業界情報
    companySize: "中小企業",         // 企業規模
  },
  threadId: "conversation-1",
  resourceId: "user-123",
});
```

### メリット

- ✅ **単一エージェント**: frontAgentだけで専門分野の会話が可能
- ✅ **動的適応**: 会話内容に応じて指示とメモリが自動調整
- ✅ **委譲不要**: 専門家への委譲処理が不要
- ✅ **一貫性**: 同じエージェント内で一貫した処理
- ✅ **効率性**: エージェント間の切り替えオーバーヘッドなし
- ✅ **柔軟性**: runtimeContextで状況に応じた処理が可能

### デメリット

- ❌ **複雑性**: 動的指示生成のロジックが複雑
- ❌ **テスト**: 様々なコンテキストでのテストが必要
- ❌ **保守性**: 指示生成ロジックの保守が必要

---

## 推奨案

### 現時点（3エージェント）: ケース5（runtimeContextを使った動的処理）

- **メッセージ共有**: 同じエージェント内で処理
- **ワーキングメモリ分離**: トピック別に動的にスキーマ変更
- **効率性**: エージェント間の切り替えなし
- **柔軟性**: 状況に応じた専門的な処理

### 将来（エージェント増加時）: ケース4（完全分離 + 手動更新）

- 速度とスケーラビリティを重視

### 避けるべき: ケース3（共通メモリインスタンス）

- スケーラビリティの問題が大きい

---

## 技術的な考慮事項

### メッセージ履歴の管理

- **共有**: 同じスレッド内でメッセージを共有
- **分離**: エージェントごとに独立したメッセージ履歴

### ワーキングメモリの管理

- **共有**: エージェント間で情報を共有
- **分離**: エージェントごとに独立した状態管理

### ストレージの管理

- **単一**: 1つのデータベースファイルで管理
- **分散**: エージェントごとに独立したデータベースファイル

### runtimeContextの活用

- **動的指示**: 会話内容に応じた専門的な指示生成
- **動的メモリ**: トピック別の特化されたスキーマ使用
- **状態管理**: 会話の文脈情報を適切に管理

---

## 結論

現在の3エージェント構成では、**ケース5（runtimeContextを使った動的処理）**が最適です。

この方法により：
- エージェント間の委譲処理が不要
- 単一エージェントで専門分野の会話が可能
- ワーキングメモリも適切に分離・管理
- 効率的で柔軟な処理が実現

将来的なスケーラビリティを考慮する場合は、**ケース4（完全分離 + 手動更新）**への移行を検討することを推奨します。
