'use client';

import { useAuth } from '@/lib/auth';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/app/hooks/use-toast';
import { CustomUIMessage } from '@/mastra';
import { ContextMemory } from '@/mastra/core/contextDefinitions';
import { Actions } from '@/app/components/Actions';

export default function Chat() {
  const [status, setStatus] = useState<string>('読み込み中');
  const [historyMessages, setHistoryMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState('');
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [sendStartTime, setSendStartTime] = useState<number | null>(null);
  const [responseStartTime, setResponseStartTime] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const sendStartTimeRef = useRef<number | null>(null);
  const [threadId, setThreadId] = useState<string>('default-thread');
  const [resourceId, setResourceId] = useState<string>('default-user');
  const [context, setContext] = useState<ContextMemory | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { session } = useAuth();
  const { toast } = useToast();
  const [receivedFirstChunk, setReceivedFirstChunk] = useState(false);

  const { messages, sendMessage, setMessages, stop, status: chatStatus, error } = useChat<CustomUIMessage>({
    transport: new DefaultChatTransport({
      api: "/api/chat/agent",
      // api: "/api/chat/workflow",
      headers: {
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
      },
    }),
    onData: ({ data, type }) => {
      if (type === 'data-status') {
        // console.log('Data part received:', data);
        // console.log('type:', type);
        if (data.status === 'first chunk') {
          setReceivedFirstChunk(true);
        }
      }
    },

    onFinish: async (message) => {
      console.log('=== Agent useChat onFinish ===');
      // レスポンス終了時の時間を測定（ストリーミング完全終了時）
      const startTime = sendStartTimeRef.current || sendStartTime;
      if (startTime) {
        const totalTime = Date.now() - startTime;
        console.log(`📊 総実行時間: ${totalTime}ms`);
        setResponseTime(totalTime);
      } else {
        console.log('❌ sendStartTimeがnullです');
      }

      console.log('message.message.role:', message.message.role);
      // メッセージのレスポンスが完了したらメモリを再取得
      if (message.message.role === 'assistant') {
        console.log('=== Agent useChat onFinish ===');
        console.log('syncWorkingMemory!!');
        await syncWorkingMemory()
      }
    },
    onError: (error) => {
      console.log('=== Agent useChat onError ===');
      console.log('error:', error);
      setStatus('エラー');

      // エラー時の時間を測定
      const startTime = sendStartTimeRef.current || sendStartTime;
      if (startTime) {
        const totalTime = Date.now() - startTime;
        console.log(`📊 エラー時の実行時間: ${totalTime}ms`);
        setResponseTime(totalTime);
      }
    },
  });

  // 初期化時にエージェントの履歴を取得
  useEffect(() => {
    const loadAgentHistory = async () => {
      try {
        setStatus('履歴読み込み中...');
        const response = await fetch(`/api/chat/agent/history?threadId=${threadId}&resourceId=${resourceId}&limit=50`);

        if (!response.ok) {
          throw new Error('履歴の取得に失敗しました');
        }

        const data = await response.json();
        setHistoryMessages(data.messages);
        console.log(`履歴を読み込みました: ${data.messages.length}件`);
        setStatus('準備完了');

        // 履歴読み込み後に一番下にスクロール（アニメーションなし）
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
          }
        }, 100);

        // 履歴がある場合は文脈分析を実行
        if (data.messages.length > 0) {
          await syncWorkingMemory()
        }

      } catch (error) {
        console.error('エージェント履歴の読み込みに失敗しました:', error);
        setStatus('履歴読み込みエラー');
        toast({
          title: "履歴読み込みエラー",
          description: "会話履歴の読み込みに失敗しました",
          variant: "destructive",
        });
      }
    };

    loadAgentHistory();
  }, [threadId, resourceId, toast]);

  // 応答開始を検知して時間を計測
  useEffect(() => {
    if (chatStatus === 'streaming' && sendStartTime && !responseStartTime) {
      const now = Date.now();
      setResponseStartTime(now);
      const timeDiff = now - sendStartTime;
      console.log(`応答開始までの時間: ${timeDiff}ms`);
    }
  }, [chatStatus, sendStartTime, responseStartTime]);

  // チャットステータスがリセットされたら時間計測もリセット
  useEffect(() => {
    if (chatStatus === 'error') {
      setSendStartTime(null);
      setResponseStartTime(null);
      setResponseTime(null);
    }
  }, [chatStatus]);


  const syncWorkingMemory = async () => {
    const response = await fetch('/api/chat/context', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    const result = await response.json() as ContextMemory;
    setContext(result);
    console.log('contextData:', result);
  }

  // 自動スクロール関数
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 強制スクロール関数（ストリーミング中専用）
  const forceScrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  };

  // メッセージが更新されたら自動スクロール
  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom();
    }
  }, [messages, shouldAutoScroll]);

  // ストリーミング中のテキスト更新を検知して自動スクロール
  useEffect(() => {
    if (chatStatus === 'streaming') {
      // ストリーミング中は定期的にスクロールを実行
      const interval = setInterval(() => {
        // shouldAutoScrollがtrueの場合のみスクロール
        if (shouldAutoScroll && chatContainerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
          const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
          if (isNearBottom) {
            forceScrollToBottom();
          }
        }
      }, 500);

      return () => clearInterval(interval);
    }
  }, [chatStatus, shouldAutoScroll]);

  // ユーザーのスクロール操作を検知
  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
      setShouldAutoScroll(isAtBottom);
    }
  };

  // 停止処理のハンドラー
  const handleStop = () => {
    stop();
    setStatus('停止');
    toast({
      title: "処理を停止しました",
      description: "チャットの処理を停止しました",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      setReceivedFirstChunk(false);
      setStatus('送信中');
      setShouldAutoScroll(true); // 新しいメッセージ送信時に自動スクロールを有効化

      // 新しい送信時に時間計測をリセット
      setResponseStartTime(null);
      setResponseTime(null);
      sendStartTimeRef.current = null;

      // 送信開始時刻を記録
      const startTime = Date.now();
      setSendStartTime(startTime);
      sendStartTimeRef.current = startTime;

      // 現在のエージェントを指定してメッセージを送信
      const currentContext = context?.currentContext || 'front';

      sendMessage({
        text: input,
        metadata: {
          currentContext,
        }
      });
      setInput("");
    }
  };

  // メッセージをクリップボードにコピー
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "コピー完了",
        description: "メッセージをクリップボードにコピーしました",
      });
    } catch (err) {
      console.error('コピーに失敗しました:', err);
      toast({
        title: "コピー失敗",
        description: "コピーに失敗しました",
        variant: "destructive",
      });
    }
  };

  // キーボードイベントハンドラー
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;

    // Shift + Enter → 改行
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = input.slice(0, start) + "\n" + input.slice(end);
      setInput(newValue);
      // キャレット位置を改行後に戻す
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      });
      return;
    }

    // Enter 単独 → 送信
    if (e.key === "Enter") {
      e.preventDefault();
      if (input.trim() !== "" && chatStatus !== 'streaming') {
        handleSubmit(e as any);
      }
    }
  };

  // LLM分析結果の表示
  const renderLLMContextAnalysis = () => {
    if (!context) return null;

    return (
      <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg animate-fade-in">
        <h3 className="font-semibold text-blue-800 mb-3">
          AI文脈分析
          {isAnalyzing && (
            <span className="text-xs text-blue-600 ml-2">
              <span className="animate-spin">⏳</span> 分析中...
            </span>
          )}
        </h3>

        <div className="space-y-4 text-sm">
          {/* 現在のエージェント */}
          {context && (
            <>
              <h3 className="text-sm font-semibold text-blue-800 mb-2">現在の文脈</h3>
              <p className="text-sm text-blue-700">
                {context.currentContext === 'plan' ? '営業計画' :
                  context.currentContext === 'list' ? '顧客データ取得' :
                    '営業に関する相談'}
              </p>
              <h3 className="text-sm font-semibold text-blue-800 mb-2">現在の文脈</h3>
              <p className="text-sm text-blue-700">
                {context.userIntent}
              </p>

              {/* 必要な情報の状況 */}
              {context.currentInfoList && context.currentInfoList.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-blue-800 mb-2">情報収集状況</h3>
                  <div className="space-y-2">
                    {context.currentInfoList.map((info, index) => (
                      <div key={index} className="text-sm">
                        <span className="text-blue-700 font-medium">{info.name}:</span>
                        <span className="text-blue-600 ml-2">{info.value ?? '未収集'}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-5">
      {/* LLM文脈分析（非同期で表示） */}
      {renderLLMContextAnalysis()}

      {/* ステータス・応答時間表示 */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-sm text-blue-800">
          <span className="font-semibold">ステータス:</span> {status}
          {threadId && resourceId && (
            <span className="ml-4">
              <span className="font-semibold">スレッド:</span> {threadId} / <span className="font-semibold">ユーザー:</span> {resourceId}
            </span>
          )}
          <span className="ml-4">
            <span className="font-semibold">レスポンス完了までの時間:</span> {responseTime !== null ? `${responseTime}ms` : '---'}
          </span>
        </div>
      </div>

      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="h-96 border border-gray-300 rounded-lg p-5 mb-5 overflow-y-auto bg-white"
      >
        {/* 履歴メッセージを最初に表示 */}
        {historyMessages.map((message) => {
          // UIMessageのpartsからテキストを抽出
          let messageContent = '';
          if (Array.isArray(message.parts)) {
            // 配列形式の場合
            messageContent = message.parts
              .filter((part: any) => part.type === 'text')
              .map((part: any) => part.text)
              .join('');
          } else {
            // その他の形式の場合
            messageContent = JSON.stringify(message.parts);
          }

          return (
            <div key={message.id} className={`mb-4 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-3 rounded-lg max-w-[80%] min-w-[200px] ${message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold">
                    {message.role === 'user' ? 'あなた' : 'アシスタント'}
                  </div>
                  <button
                    onClick={() => copyToClipboard(messageContent)}
                    className={`p-1 rounded transition-colors cursor-pointer ${message.role === 'user' ? 'text-blue-100 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                    title="メッセージをコピー"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <div className="whitespace-pre-wrap text-sm">
                  {messageContent}
                </div>
              </div>
            </div>
          );
        })}

        {/* 現在のセッションのメッセージ */}
        {messages.map((message, index) => {
          // メッセージのテキスト内容を抽出
          const messageText = message.parts
            .filter(part => part.type === 'text')
            .map(part => part.text)
            .join('');

          return (
            <div key={index} className={`mb-4 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-3 rounded-lg max-w-[80%] min-w-[200px] ${message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold">
                    {message.role === 'user' ? 'あなた' : 'アシスタント'}
                  </div>
                  {messageText && (
                    <button
                      onClick={() => copyToClipboard(messageText)}
                      className={`p-1 rounded transition-colors cursor-pointer ${message.role === 'user' ? 'text-blue-100 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                      title="メッセージをコピー"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  )}
                </div>
                {/* ローディング状態のアシスタントメッセージ */}
                <div className="whitespace-pre-wrap">
                  {/* {!receivedFirstChunk && message.role === 'assistant' && index === messages.length - 1 && (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      <span className="text-sm text-gray-600">
                        応答を生成中...
                      </span>
                    </div>
                  )} */}
                  {message.parts.map((part, index) => (
                    <div key={part.type + index}>
                      {part.type === 'text' && (
                        <div className={`text-sm ${message.role === 'user' ? 'text-white' : 'text-gray-800'}`}>
                          {part.text}
                        </div>
                      )}

                      {/* todo このカスタムデータからコンポーネント情報を取得して、コンポーネントを表示する */}
                      {part.type === 'data-custom' && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                          <div className="text-xs text-green-600 font-semibold mb-1">Context:</div>
                          <pre className="text-xs text-green-800 whitespace-pre-wrap">
                            {JSON.stringify(part.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 利用可能なアクション */}
      <Actions context={context} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="input" className="block text-sm font-medium mb-2 text-gray-700">
            メッセージ入力
          </label>
          <textarea
            id="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力してください... (Enter: 送信, Shift+Enter: 改行)"
            className="w-full p-3 border border-gray-300 rounded-lg resize-none text-gray-800 bg-white"
            rows={3}
            disabled={chatStatus === 'streaming' || chatStatus === 'submitted'}
          />
        </div>

        <button
          type={chatStatus === 'streaming' ? 'button' : 'submit'}
          disabled={chatStatus === 'streaming' ? false : (!input.trim() || chatStatus === 'submitted')}
          onClick={chatStatus === 'streaming' ? handleStop : undefined}
          className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${chatStatus === 'streaming'
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-blue-600 hover:bg-blue-700'
            }`}
        >
          {chatStatus === 'streaming' ? '停止' : chatStatus === 'submitted' ? '送信中...' : '送信'}
        </button>
      </form>

    </div>
  );
}
