HITLをもう一度考える

https://mastra.ai/ja/docs/workflows/suspend-and-resume#resume-%E3%82%92%E4%BD%BF%E3%81%A3%E3%81%A6%E3%83%AF%E3%83%BC%E3%82%AF%E3%83%95%E3%83%AD%E3%83%BC%E3%82%92%E5%86%8D%E9%96%8B%E3%81%99%E3%82%8B
→stepIdの省略が可能。

https://mastra.ai/ja/examples/workflows/suspend-and-resume


https://mastra.ai/ja/reference/workflows/resume
・suspendの後のreturn文はresume()が呼び出された後に実行される
→なのでその前提で実装しないと無駄な実装が増えそう。

・contextにデータを渡すとexecutor引数のcontext.inputDataとして使える。
→この説明はちょっと怪しい。resumeDataの間違いと思われる。

何をメタデータに保存すれば良いのかをもう一度考える

https://mastra.ai/ja/reference/workflows/step
executeの引数のgetStepResultでsuspend時に渡したデータを取得できる。引数のstepIdは固定で管理可能。
よってresumeの時に使いたいデータはsuspendでメタデータとして渡しておけば良い。
再開に必要なデータはユーザからの入力(resumeSchema)とrunIdなので、runIdをメッセージのmetadataで保持しておけば良い。
あとはワークフローのrunオブジェクトの取得が必要なので、ワークフロー名もmetadataに保存が必要

// 現状のResumeDataの型定義
export type ResumeData = {
  runId: string;
  stepId: string;
  choice: string;
  feedbackText?: string;
  workflowName?: string;
};

