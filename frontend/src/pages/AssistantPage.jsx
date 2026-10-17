import { useState, useRef, useEffect } from 'react';

export default function AssistantPage() {
  const [messages, setMessages] = useState([
    { sender: 'assistant', text: 'Hi! Ask me anything about your uploaded financial documents.' }
  ]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const bottomRef                 = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput('');
    setMessages(m => [...m, { sender: 'user', text: question }]);
    setLoading(true);

    try {
      const resp = await fetch('/api/v1/chat/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('findoc_token') || localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ question, session_id: sessionId })
      });
      const data = await resp.json();
      if (!sessionId) setSessionId(data.session_id);
      setMessages(m => [...m, { sender: 'assistant', text: data.answer }]);
    } catch {
      setMessages(m => [...m, { sender: 'assistant', text: 'Something went wrong. Try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen p-4 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-4">AI Financial Copilot</h2>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 bg-gray-50 rounded-2xl p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              m.sender === 'user'
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-white shadow text-gray-800 rounded-bl-sm'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white shadow px-4 py-3 rounded-2xl text-sm text-gray-400 rounded-bl-sm">
              Analysing documents...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ask about cash flow, anomalies, GST mismatch..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="bg-blue-600 text-white px-5 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export { AssistantPage };
export const CopilotPage = AssistantPage;
