import { NextResponse } from 'next/server';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
};

// 仮のメッセージデータ（実際の実装ではデータベースから取得）
const mockMessages: Message[] = [
  {
    id: '1',
    role: 'user',
    content: 'こんにちは！',
    createdAt: new Date('2024-01-01T10:00:00Z'),
  },
  {
    id: '2',
    role: 'assistant',
    content: 'こんにちは！何かお手伝いできることはありますか？',
    createdAt: new Date('2024-01-01T10:00:01Z'),
  },
];

export async function GET() {
  return NextResponse.json({ messages: mockMessages });
}
