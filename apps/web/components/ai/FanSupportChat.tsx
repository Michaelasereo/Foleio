'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const INITIAL_MESSAGES: Message[] = [
  {
    role: 'assistant',
    content:
      "Hi there! 👋 I'm Fola. Need help with a booking, purchase, or subscription? Ask me anything!",
  },
];

export function FanSupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isOpen]);

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const nextMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/fan-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!response.ok) throw new Error('Support request failed');

      const data = (await response.json()) as { message?: string };
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            data.message?.trim() ||
            "Sorry, I'm having a moment 😅 Try again or email support@foleio.com",
        },
      ]);
    } catch (error) {
      console.error('Fan support request failed:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I'm having a moment 😅 Try again or email support@foleio.com",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 group">
          <div className="pointer-events-none absolute -top-10 right-0 rounded-md bg-card px-2 py-1 text-xs text-muted-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
            Need help?
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Open fan support chat"
            className="chat-bubble-btn bg-accent text-accent-foreground"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
        </div>
      )}

      {isOpen && (
        <div className="chat-panel animate-fola-sheet border border-border bg-background">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                  F
                </div>
                <p className="text-sm font-semibold">Fola · Support</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close fan support chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      message.role === 'user'
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-card text-foreground'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-card px-3 py-2">
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/80" />
                      <span
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/80"
                        style={{ animationDelay: '120ms' }}
                      />
                      <span
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/80"
                        style={{ animationDelay: '240ms' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div ref={endRef} />
            </div>

            <form onSubmit={sendMessage} className="border-t border-border p-3">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask about booking, purchase, or subscriptions..."
                  className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none ring-0 placeholder:text-muted-foreground focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="inline-flex h-10 items-center gap-1 rounded-xl bg-accent px-3 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <MessageCircle className="h-4 w-4" />
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
