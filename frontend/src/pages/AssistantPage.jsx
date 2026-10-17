import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, RefreshCw, FileText } from 'lucide-react';

export default function AssistantPage() {
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: 'Welcome to FinDocAI Scrutiny Copilot. I have full access to your ingested evidence files (Bank statements, GST returns, Invoices, ITR) and the Final Audit Report findings. What would you like to verify?'
    }
  ]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const bottomRef                 = useRef(null);
  const inputRef                  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendQuestion = async (queryText) => {
    const question = (queryText || input).trim();
    if (!question || loading) return;

    setInput('');
    setMessages(m => [...m, { sender: 'user', text: question }]);
    setLoading(true);

    try {
      const token = localStorage.getItem('findoc_token') || localStorage.getItem('token') || '';
      const resp = await fetch('/api/v1/chat/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ question, session_id: sessionId })
      });
      const data = await resp.json();
      if (!sessionId && data.session_id) setSessionId(data.session_id);

      setMessages(m => [
        ...m,
        {
          sender: 'assistant',
          text: data.answer || 'No response generated.',
          sources: data.sources || []
        }
      ]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(m => [
        ...m,
        { sender: 'assistant', text: 'Error querying scrutiny copilot. Please verify network connection and try again.' }
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const quickPrompts = [
    'Summarize the Final Audit Report & Variance',
    'What are the high-severity anomalies detected?',
    'Are there any Bank vs GST turnover discrepancies?'
  ];

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white border border-slate-300 rounded-[2px] shadow-sm">
      {/* Header */}
      <div className="p-3 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
        <div>
          <div className="audit-kicker">FINANCIAL SCRUTINY COPILOT (RAG)</div>
          <h2 className="text-xs md:text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <Bot className="w-4 h-4 text-[#0b3861]" />
            <span>AI Statutory Audit & Reconciliation Assistant</span>
          </h2>
          <p className="text-[11px] text-slate-500 font-mono">
            Grounded in Bank Statements, GSTR-3B, Invoices & Form 3CD Audit Findings
          </p>
        </div>
        <button
          onClick={() => {
            setMessages([
              {
                sender: 'assistant',
                text: 'Audit session reset. How can I assist you with your working papers?'
              }
            ]);
            setSessionId(null);
          }}
          className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1"
          title="Reset Copilot Conversation"
        >
          <RefreshCw className="w-3 h-3 text-slate-500" />
          <span>New Session</span>
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
        {messages.map((m, i) => {
          const isUser = m.sender === 'user';
          return (
            <div key={i} className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <div className="w-7 h-7 rounded-[2px] bg-[#0b3861] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-[85%] rounded-[2px] p-3 text-xs leading-relaxed ${
                isUser
                  ? 'bg-[#0b3861] text-white font-medium shadow-sm'
                  : 'bg-white border border-slate-300 text-slate-800 shadow-sm'
              }`}>
                <div className="whitespace-pre-wrap">{m.text}</div>

                {/* Sources chips */}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Sources:</span>
                    {m.sources.map((src, sIdx) => (
                      <span
                        key={sIdx}
                        className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        <FileText className="w-2.5 h-2.5 text-slate-500" />
                        {src}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-[2px] bg-slate-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-[2px] bg-[#0b3861] text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-300 px-3.5 py-2.5 rounded-[2px] text-xs text-slate-500 flex items-center gap-2 shadow-sm">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0b3861]" />
              <span className="font-mono">Analyzing ingested financial evidence & computing audit variance...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-3 py-1.5 bg-slate-100 border-t border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
        <Sparkles className="w-3 h-3 text-[#0b3861] shrink-0" />
        <span className="text-[10px] font-bold uppercase text-slate-500 font-mono shrink-0">Quick Queries:</span>
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            disabled={loading}
            onClick={() => sendQuestion(p)}
            className="text-[11px] bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-2.5 py-0.5 rounded-[2px] shrink-0 transition-colors disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Row */}
      <div className="p-2.5 border-t border-slate-200 bg-white shrink-0 flex gap-2 items-center">
        <input
          ref={inputRef}
          type="text"
          className="flex-1 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-[2px] px-3.5 py-2 text-xs font-sans outline-none focus:border-[#0b3861] focus:ring-1 focus:ring-[#0b3861] shadow-inner"
          placeholder="Type your question about cash flow, GST reconciliation, high-value payments, or tax risks..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendQuestion();
            }
          }}
          disabled={loading}
        />
        <button
          onClick={() => sendQuestion()}
          disabled={loading || !input.trim()}
          className="bg-[#0b3861] hover:bg-[#082b4a] text-white px-4 py-2 rounded-[2px] text-xs font-bold disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
}

export { AssistantPage };
export const CopilotPage = AssistantPage;
