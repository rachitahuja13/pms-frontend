import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Sparkles, Send, Loader2, RotateCcw } from 'lucide-react';
import { api, extractErrorMessage } from '../api/client';
import type { ChatMessage, ChatResponse } from '../types';

const SUGGESTIONS = [
  "What's overdue right now?",
  'Summarize the status of all active projects.',
  'Who has the most tasks assigned to them?',
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setSending(true);

    try {
      const { data } = await api.post<ChatResponse>('/chat', {
        message: trimmed,
        history: messages, // prior turns, not including the one just sent
      });
      setMessages([...nextMessages, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setError(extractErrorMessage(err, 'The AI assistant could not respond. Please try again.'));
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    send(input);
  }

  return (
    <>
      <div className="top-strip">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>AI Assistant</h1>
          <p>Ask questions about your projects and tasks. Runs on a local model — nothing leaves your network.</p>
        </div>
        {messages.length > 0 && (
          <button className="btn btn--secondary" onClick={() => setMessages([])}>
            <RotateCcw size={14} strokeWidth={2} />
            New chat
          </button>
        )}
      </div>

      <div className="chat-panel card">
        <div className="chat-panel__messages" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="chat-empty">
              <div className="chat-empty__icon">
                <Sparkles size={22} strokeWidth={2} />
              </div>
              <p>Ask anything about the current state of your projects and tasks.</p>
              <div className="chat-empty__suggestions">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="chat-suggestion" onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`chat-bubble chat-bubble--${m.role}`}>
                {m.content}
              </div>
            ))
          )}

          {sending && (
            <div className="chat-bubble chat-bubble--assistant chat-bubble--pending">
              <Loader2 size={14} strokeWidth={2} className="chat-spin" />
              Thinking…
            </div>
          )}
        </div>

        {error && <div className="error-banner" style={{ margin: '0 16px 12px' }}>{error}</div>}

        <form className="chat-panel__input-row" onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a project or task…"
            disabled={sending}
          />
          <button type="submit" className="btn btn--primary" disabled={sending || !input.trim()} aria-label="Send">
            <Send size={15} strokeWidth={2} />
          </button>
        </form>
      </div>
    </>
  );
}
