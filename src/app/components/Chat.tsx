'use client';

import { useAuth } from '@/lib/auth';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect } from 'react';

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
  const { session } = useAuth();

  const { messages, sendMessage, status: chatStatus, error } = useChat({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      setStatus('送信中');
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

      <div className="h-96 border border-gray-300 rounded-lg p-5 mb-5 overflow-y-auto bg-white">
        {messages.map((message) => (
          <div key={message.id} className={`mb-4 p-3 rounded-lg ${message.role === 'user' ? 'bg-blue-50' : 'bg-gray-50'
            }`}>
            <div className="font-bold mb-2 text-gray-800">
              {message.role === 'user' ? 'あなた' : 'アシスタント'}
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
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="input" className="block text-sm font-medium mb-2 text-gray-700">
            メッセージ入力
          </label>
          <textarea
            id="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="defaultWorkflowに送信するメッセージを入力してください..."
            className="w-full p-3 border border-gray-300 rounded-lg resize-none text-gray-800 bg-white"
            rows={3}
            disabled={chatStatus === 'streaming'}
          />
        </div>

        <button
          type="submit"
          disabled={!input.trim() || chatStatus === 'streaming'}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {chatStatus === 'submitted' ? '送信中...' : '送信'}
        </button>
      </form>
    </div>
  );
}
