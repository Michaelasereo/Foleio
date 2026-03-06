'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Sparkles, X } from 'lucide-react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const GREETING_MESSAGE: Message = {
  role: 'assistant',
  content:
    "Hey! 👋 I'm Fola, your Foleio setup guide. I'm here to help you get your creator profile ready. What step are you on, or do you have any questions?",
};

const SEEN_KEY = 'foleio-onboarding-assistant-opened';

export function OnboardingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSeenAssistant, setHasSeenAssistant] = useState(true);

  const messageEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const seen = sessionStorage.getItem(SEEN_KEY) === 'true';
    setHasSeenAssistant(seen);
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isOpen]);

  const showPulse = useMemo(() => !hasSeenAssistant && !isOpen, [hasSeenAssistant, isOpen]);

  const openAssistant = () => {
    setIsOpen(true);
    if (!hasSeenAssistant) {
      sessionStorage.setItem(SEEN_KEY, 'true');
      setHasSeenAssistant(true);
    }
  };

  const closeAssistant = () => setIsOpen(false);

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const nextMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/onboarding-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!response.ok) {
        throw new Error('Request failed');
      }

      const data = (await response.json()) as { message?: string };
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            data.message?.trim() ||
            'I am here with you. Try again and I will help you through this step. You are doing great, keep going.',
        },
      ]);
    } catch (error) {
      console.error('Assistant request failed:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'I could not reply just now. Please try again in a moment, and we will keep your setup moving.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 sm:bottom-6 sm:right-6">
      {!isOpen && (
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-background/95 px-3 py-1 text-xs text-muted-foreground shadow-md border border-border">
            Need help?
          </span>
          <button
            type="button"
            onClick={openAssistant}
            className={`chat-bubble-btn bg-primary text-primary-foreground shadow-[0_10px_30px_rgba(249,115,22,0.35)] ${
              showPulse ? 'animate-pulse' : ''
            }`}
            aria-label="Open onboarding assistant"
          >
            <Sparkles className="h-5 w-5" />
          </button>
        </div>
      )}

      {isOpen && (
        <div className="chat-panel animate-fola-sheet border border-border bg-background">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  F
                </div>
                <div>
                  <p className="text-sm font-semibold">Fola · Onboarding Assistant</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeAssistant}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close onboarding assistant"
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
                        ? 'bg-primary text-primary-foreground'
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
              <div ref={messageEndRef} />
            </div>

            <form onSubmit={sendMessage} className="border-t border-border p-3">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask Fola about this step..."
                  className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none ring-0 placeholder:text-muted-foreground focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="inline-flex h-10 items-center gap-1 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <MessageCircle className="h-4 w-4" />
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
