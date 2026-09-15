import { useState, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Sparkles, Send } from 'lucide-react';
import { assistantApi } from '../../lib/resources';
import { Card } from '../../components/ui/Display';
import Button from '../../components/ui/Button';

const SUGGESTIONS = [
  'What tasks are at risk?',
  'What is blocking the release?',
  'Which milestones are behind schedule?',
  'Summarize this project',
];

export default function ProjectAssistantPage() {
  const { project } = useOutletContext();
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Ask me about "${project.name}" — I can only see what you're authorized to see in this project.` },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const ask = async (query) => {
    if (!query.trim()) return;
    setMessages((m) => [...m, { role: 'user', text: query }]);
    setInput('');
    setLoading(true);
    try {
      const { data } = await assistantApi.ask(project._id, query);
      setMessages((m) => [...m, { role: 'assistant', text: data.data.answer }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: "Sorry, I couldn't process that." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-220px)] max-w-2xl flex-col">
      <Card className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line px-5 py-3">
          <Sparkles size={16} className="text-signal" />
          <span className="text-sm font-semibold text-ink">Project Assistant</span>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-md px-3.5 py-2 text-sm ${
                  m.role === 'user' ? 'bg-signal text-white' : 'bg-paper text-ink'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading && <div className="text-xs text-ink-faint">Thinking…</div>}
          <div ref={endRef} />
        </div>

        <div className="flex flex-wrap gap-2 border-t border-line p-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="rounded-full border border-line px-3 py-1 text-xs text-ink-muted hover:border-signal hover:text-signal-dim"
            >
              {s}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex gap-2 border-t border-line p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this project…"
            className="flex-1 rounded-md border border-line px-3 py-2 text-sm focus:border-signal focus:outline-none"
          />
          <Button type="submit" disabled={loading}>
            <Send size={15} />
          </Button>
        </form>
      </Card>
      <p className="mt-2 text-center text-xs text-ink-faint">
        Answers are generated from this project's own data — nothing your role can't already see.
      </p>
    </div>
  );
}
