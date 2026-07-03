import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Loader2, Sparkles } from 'lucide-react';
import AccordionCard from './AccordionCard';
import axios from 'axios';

const API = import.meta.env.PROD ? '/api' : 'http://localhost:7860/api';

const STARTER_QUESTIONS = [
  "Why was the first person's name hidden?",
  "What's the biggest privacy risk in this document?",
  "Which entities were kept visible and why?",
  "Are there any re-identification risks I should know about?",
];

export default function InterrogationChat({ entities, safeEntities, redactedIndices, aliasSuggestions, token }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hello! I'm VEILiq. Ask me anything about why specific words in this document were hidden or kept visible. My answers are grounded entirely in this document's actual detection data." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (question) => {
    const q = question || input.trim();
    if (!q) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);

    try {
      const metadata = {
        entities,
        safeEntities,
        redactedIndices,
        aliasSuggestions,
      };
      const res = await axios.post(`${API}/chat`, 
        { question: q, metadata },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessages(prev => [...prev, { role: 'assistant', text: res.data.answer || 'No answer returned.' }]);
    } catch (e) {
      if (e.response && e.response.data && e.response.data.error) {
        setMessages(prev => [...prev, { role: 'assistant', text: e.response.data.error }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, I encountered a network error. Please try again.' }]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AccordionCard
      icon={<MessageCircle size={20} />}
      iconColor="#A78BFA"
      iconBg="rgba(167,139,250,0.1)"
      title={<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Ask VEILiq Why <Sparkles size={14} color="#A78BFA" /></div>}
      subtitle="Interrogate every redaction decision"
    >
      {messages.length <= 1 && (
        <div style={{ padding: '0 0 12px 0', display: 'flex', flexWrap: 'wrap', gap: 8, borderBottom: '1px solid var(--border-glass)', marginBottom: 12 }}>
          {STARTER_QUESTIONS.map((q, i) => (
            <button key={i} onClick={() => sendMessage(q)} style={{
              background: 'var(--bg-glass-strong)', border: '1px solid var(--border-glass)',
              color: 'var(--text-muted)', borderRadius: 20, padding: '4px 12px', fontSize: '0.78rem',
              cursor: 'pointer', transition: 'all 0.2s'
            }} onMouseEnter={e => { e.target.style.borderColor = '#A78BFA'; e.target.style.color = '#A78BFA'; }}
               onMouseLeave={e => { e.target.style.borderColor = 'var(--border-glass)'; e.target.style.color = 'var(--text-muted)'; }}>
              {q}
            </button>
          ))}
        </div>
      )}

      <div ref={scrollContainerRef} style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 }}>
        {messages.map((msg, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
            }}>
            <div style={{
              maxWidth: '85%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg-glass-strong)',
              border: msg.role === 'user' ? 'none' : '1px solid var(--border-glass)',
              color: msg.role === 'user' ? '#fff' : 'var(--text-body)',
              fontSize: '0.85rem', lineHeight: 1.6, whiteSpace: 'pre-wrap'
            }}>
              {msg.text}
            </div>
          </motion.div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ background: 'var(--bg-glass-strong)', border: '1px solid var(--border-glass)', padding: '10px 14px', borderRadius: '16px 16px 16px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Loader2 size={14} className="spin-animation" color="#A78BFA" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Thinking...</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Ask why a specific word was hidden..."
          style={{
            flex: 1, background: 'var(--bg-glass-strong)', border: '1px solid var(--border-glass)',
            padding: '10px 14px', borderRadius: 20, color: 'var(--text-dark)', fontSize: '0.85rem',
            outline: 'none'
          }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={{
            background: 'var(--primary)', border: 'none', color: '#fff', padding: '0 16px',
            borderRadius: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: (!input.trim() || loading) ? 0.6 : 1
          }}
        >
          <Send size={16} />
        </button>
      </div>

      <style>{`.spin-animation { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AccordionCard>
  );
}
