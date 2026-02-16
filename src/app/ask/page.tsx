'use client';

import ChatInterface from '@/components/chat/ChatInterface';

export default function AskPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Ask About Your Portfolio</h1>
        <p className="text-sm text-text-tertiary">
          Ask questions about your holdings, risk exposure, momentum, and more
        </p>
      </div>
      <ChatInterface />
    </div>
  );
}
