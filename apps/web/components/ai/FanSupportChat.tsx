'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const INITIAL_MESSAGES: Message[] = [
  {
    role: 'assistant',
    content:
      "Hi — I'm Fola. Need help with a booking, purchase, or subscription? Ask me anything.",
  },
];

const chatCss = `
.foleio-chat-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 50;
  width: 56px;
  height: 56px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #c9c6c1;
  background: #e4e2de;
  color: #001035;
  cursor: pointer;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
  transition: transform 0.2s ease, background 0.15s ease;
}
.foleio-chat-fab:hover { transform: scale(1.06); background: #ebe9e5; }
.foleio-chat-hint {
  pointer-events: none;
  position: absolute;
  right: 0;
  bottom: calc(100% + 10px);
  padding: 6px 10px;
  border-radius: 8px;
  background: #2a2a2a;
  border: 1px solid rgba(255,255,255,0.12);
  color: #e0ddd8;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.foleio-chat-fab-wrap:hover .foleio-chat-hint { opacity: 1; }
.foleio-chat-panel {
  position: fixed;
  bottom: 92px;
  right: 24px;
  z-index: 50;
  width: 380px;
  height: 480px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 120px);
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.12);
  background: #212121;
  color: #e0ddd8;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: var(--font-body), system-ui, sans-serif;
  animation: foleioChatUp 0.22s ease-out;
}
@keyframes foleioChatUp {
  from { transform: translateY(12px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.foleio-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.foleio-chat-avatar {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e4e2de;
  color: #001035;
  font-size: 13px;
  font-weight: 700;
}
.foleio-chat-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #e4e2de;
}
.foleio-chat-close {
  border: 0;
  background: transparent;
  color: #828282;
  padding: 6px;
  border-radius: 8px;
  cursor: pointer;
}
.foleio-chat-close:hover { color: #e4e2de; background: rgba(255,255,255,0.06); }
.foleio-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.foleio-chat-bubble {
  max-width: 85%;
  padding: 10px 12px;
  border-radius: 14px;
  font-size: 13px;
  line-height: 1.45;
  white-space: pre-wrap;
}
.foleio-chat-bubble.is-user {
  align-self: flex-end;
  background: #e4e2de;
  color: #001035;
}
.foleio-chat-bubble.is-assistant {
  align-self: flex-start;
  background: #2b2b2b;
  color: #e0ddd8;
  border: 1px solid rgba(255,255,255,0.06);
}
.foleio-chat-typing {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}
.foleio-chat-typing span {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #828282;
  animation: foleioChatDot 1s ease-in-out infinite;
}
.foleio-chat-typing span:nth-child(2) { animation-delay: 0.12s; }
.foleio-chat-typing span:nth-child(3) { animation-delay: 0.24s; }
@keyframes foleioChatDot {
  0%, 80%, 100% { opacity: 0.35; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-2px); }
}
.foleio-chat-form {
  border-top: 1px solid rgba(255,255,255,0.1);
  padding: 12px;
  display: flex;
  gap: 8px;
  align-items: center;
}
.foleio-chat-input {
  flex: 1;
  min-height: 42px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.04);
  color: #e0ddd8;
  font: inherit;
  font-size: 13px;
  outline: none;
}
.foleio-chat-input::placeholder { color: #828282; }
.foleio-chat-input:focus {
  border-color: rgba(255,255,255,0.35);
  background: rgba(255,255,255,0.06);
}
.foleio-chat-send {
  min-height: 42px;
  padding: 0 14px;
  border-radius: 9px;
  border: 1px solid #c9c6c1;
  background: #e4e2de;
  color: #001035;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.36px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: background 0.15s ease;
}
.foleio-chat-send:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.foleio-chat-send:not(:disabled):hover { background: #ebe9e5; }
@media (max-width: 480px) {
  .foleio-chat-panel {
    right: 12px;
    left: 12px;
    width: auto;
    bottom: 84px;
  }
  .foleio-chat-fab { right: 16px; bottom: 16px; }
}
`;

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
            'Sorry, something went wrong. Try again or email support@foleio.com',
        },
      ]);
    } catch (error) {
      console.error('Fan support request failed:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, something went wrong. Try again or email support@foleio.com',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: chatCss }} />

      {!isOpen ? (
        <div className="foleio-chat-fab-wrap" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 50 }}>
          <div className="foleio-chat-hint">Need help?</div>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Open fan support chat"
            className="foleio-chat-fab"
            style={{ position: 'relative', bottom: 'auto', right: 'auto' }}
          >
            <MessageCircle className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
      ) : null}

      {isOpen ? (
        <div className="foleio-chat-panel" role="dialog" aria-label="Fola support chat">
          <div className="foleio-chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="foleio-chat-avatar" aria-hidden>
                F
              </div>
              <p className="foleio-chat-title">Fola · Support</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="foleio-chat-close"
              aria-label="Close fan support chat"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>

          <div className="foleio-chat-messages">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`foleio-chat-bubble ${
                  message.role === 'user' ? 'is-user' : 'is-assistant'
                }`}
              >
                {message.content}
              </div>
            ))}

            {isLoading ? (
              <div className="foleio-chat-bubble is-assistant">
                <div className="foleio-chat-typing" aria-label="Fola is typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            ) : null}

            <div ref={endRef} />
          </div>

          <form onSubmit={(e) => void sendMessage(e)} className="foleio-chat-form">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about booking or purchases…"
              className="foleio-chat-input"
              aria-label="Message Fola"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="foleio-chat-send"
            >
              <Send className="h-4 w-4" strokeWidth={1.75} />
              Send
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
