'use client';

import { useAuth } from '@/lib/auth';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/app/hooks/use-toast';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
};

export default function Chat() {
  const [status, setStatus] = useState<string>('');
  const [historyMessages, setHistoryMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [sendStartTime, setSendStartTime] = useState<number | null>(null);
  const [responseStartTime, setResponseStartTime] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { session } = useAuth();
  const { toast } = useToast();

  const { messages, sendMessage, stop, status: chatStatus, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: {
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
      },
    }),

    onFinish: (message) => {
      console.log('=== DefaultWorkflow useChat onFinish ===');
      console.log('message:', message);
      setStatus('完了');
    },
    onError: (error) => {
      console.log('=== DefaultWorkflow useChat onError ===');
      console.log('error:', error);
      setStatus('エラー');
    },
  });

  // 応答開始を検知して時間を計測
  useEffect(() => {
    if (chatStatus === 'streaming' && sendStartTime && !responseStartTime) {
      const now = Date.now();
      setResponseStartTime(now);
      const timeDiff = now - sendStartTime;
      setResponseTime(timeDiff);
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
      setStatus('送信中');
      setShouldAutoScroll(true); // 新しいメッセージ送信時に自動スクロールを有効化

      // 新しい送信時に時間計測をリセット
      setResponseStartTime(null);
      setResponseTime(null);

      // 送信開始時刻を記録
      setSendStartTime(Date.now());

      // 入力履歴に追加
      const trimmedInput = input.trim();
      setInputHistory(prev => {
        const newHistory = [trimmedInput, ...prev.filter(item => item !== trimmedInput)].slice(0, 10);
        return newHistory;
      });
      setHistoryIndex(-1); // 履歴インデックスをリセット

      await sendMessage({
        text: input,
        metadata: {
          type: "workflow-resume",
          data: {
            // todo ここでresumeDataを送信する
          }
        }

      });
      setInput("");
    }
  };

  // メッセージをクリップボードにコピー
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // コピー成功のフィードバック
      console.log('メッセージをコピーしました');
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

    // 上下キーで履歴を操作
    if (e.key === "ArrowUp" && e.metaKey) {
      e.preventDefault();
      if (inputHistory.length > 0) {
        const newIndex = historyIndex < inputHistory.length - 1 ? historyIndex + 1 : 0;
        setHistoryIndex(newIndex);
        setInput(inputHistory[newIndex]);
      }
      return;
    }

    if (e.key === "ArrowDown" && e.metaKey) {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(inputHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput("");
      }
      return;
    }

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

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await fetch('/api/messages');
        const data = await response.json();
        const initialMessages: Message[] = data.messages.map((msg: Message) => ({
          ...msg,
          createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date()
        }));
        setHistoryMessages(initialMessages);
      } catch (error) {
        console.error('メッセージの読み込みに失敗しました:', error);
      } finally {
        setStatus('読み込み中');
      }
    };

    loadMessages();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-5">
      <h1 className="text-center mb-8 text-2xl font-bold text-gray-800">チャット</h1>

      {/* 応答時間表示 */}
      {responseTime !== null && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-sm text-green-800">
            <span className="font-semibold">応答開始までの時間:</span> {responseTime}ms
          </div>
        </div>
      )}

      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="h-96 border border-gray-300 rounded-lg p-5 mb-5 overflow-y-auto bg-white"
      >
        {messages.map((message) => {
          // メッセージのテキスト内容を抽出
          const messageText = message.parts
            .filter(part => part.type === 'text')
            .map(part => part.text)
            .join('');

          return (
            <div key={message.id} className={`mb-4 p-3 rounded-lg ${message.role === 'user' ? 'bg-blue-50' : 'bg-gray-50'
              }`}>
              <div className="flex justify-between items-start mb-2">
                <div className="font-bold text-gray-800">
                  {message.role === 'user' ? 'あなた' : 'アシスタント'}
                </div>
                {messageText && (
                  <button
                    onClick={() => copyToClipboard(messageText)}
                    className="text-gray-500 hover:text-gray-700 p-1 rounded transition-colors cursor-pointer"
                    title="メッセージをコピー"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="whitespace-pre-wrap">
                {message.parts.map((part) => (
                  <div key={part.type}>
                    <div className="text-xs text-gray-600">
                      {part.type === 'data-status' && (part.data as { status?: string })?.status}
                    </div>
                    <div className="text-sm text-gray-800">
                      {part.type === 'text' && part.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="input" className="block text-sm font-medium mb-2 text-gray-700">
            メッセージ入力
          </label>
          <textarea
            id="input"
            autoComplete="on"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="defaultWorkflowに送信するメッセージを入力してください... (Enter: 送信, Shift+Enter: 改行, Cmd+↑/↓: 履歴)"
            className="w-full p-3 border border-gray-300 rounded-lg resize-none text-gray-800 bg-white"
            rows={3}
            disabled={chatStatus === 'streaming'}
          />
        </div>

        <button
          type={chatStatus === 'streaming' ? 'button' : 'submit'}
          disabled={!input.trim() && chatStatus !== 'streaming'}
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
