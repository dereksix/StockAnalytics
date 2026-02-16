'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const EXAMPLE_QUESTIONS = [
  "What's my most risky position?",
  "Should I rebalance anything?",
  "Which holding has the best momentum?",
  "Am I too concentrated in any sector?",
  "If the market drops 20%, what happens to my portfolio?",
  "Which positions should I consider trimming?",
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (question: string) => {
    if (!question.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: question.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: `Error: ${errorData.error || 'Failed to get response'}`,
          };
          return updated;
        });
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      let fullText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: fullText };
          return updated;
        });
      }
    } catch (error) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Failed to connect'}`,
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col card">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-lg font-medium text-text-secondary">Ask about your portfolio</p>
            <p className="mt-1 text-sm text-text-muted">
              Get AI-powered insights about your holdings, risk, and strategy
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {EXAMPLE_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="rounded-full border border-border-subtle bg-elevated px-3 py-1.5 text-xs text-text-tertiary hover:bg-active hover:text-text-primary hover:border-border-default transition-all duration-150"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15">
                  <Bot className="h-4 w-4 text-accent" />
                </div>
              )}
              <div
                className={`max-w-[80%] px-4 py-3 ${
                  msg.role === 'user'
                    ? 'rounded-2xl rounded-br-sm bg-accent text-white'
                    : 'rounded-2xl rounded-bl-sm bg-elevated text-text-secondary'
                }`}
              >
                {msg.role === 'assistant' && msg.content === '' && loading ? (
                  <div className="flex items-center gap-1 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : (
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="border-t border-border-subtle p-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your portfolio..."
            disabled={loading}
            className="flex-1 rounded-lg border border-border-default bg-elevated px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-glow-accent hover:bg-accent-hover transition-all duration-150 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-xs text-text-muted">
          AI analysis is for informational purposes only. Not financial advice.
        </p>
      </form>
    </div>
  );
}
