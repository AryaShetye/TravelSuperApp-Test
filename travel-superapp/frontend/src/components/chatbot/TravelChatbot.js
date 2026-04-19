import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../../services/api';
import './TravelChatbot.css';

const QUICK_PROMPTS = [
  { label: '🏖️ Goa trip', text: 'Plan a 3-day trip to Goa' },
  { label: '⛰️ Manali', text: 'Best places to visit in Manali' },
  { label: '💰 Budget tips', text: 'Budget travel tips for India' },
  { label: '✈️ Flights', text: 'How to find cheap flights in India?' },
];

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content: "👋 Hi! I'm TravelBot, your AI travel assistant.\n\nI can help you plan trips, find hotels, suggest destinations, and answer any travel questions.\n\nWhere would you like to go? 🗺️",
  timestamp: new Date().toISOString(),
};

export default function TravelChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setHasUnread(false);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async (text) => {
    const messageText = (text || input).trim();
    if (!messageText || loading) return;

    const userMsg = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build history for context (exclude welcome message)
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      const res = await api.post('/chat', {
        message: messageText,
        history,
      });

      const botMsg = {
        id: `bot_${Date.now()}`,
        role: 'assistant',
        content: res.data.reply,
        timestamp: res.data.timestamp || new Date().toISOString(),
      };

      setMessages(prev => [...prev, botMsg]);

      // Show unread badge if chat is closed
      if (!isOpen) setHasUnread(true);
    } catch (err) {
      const errMsg = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: err.response?.status === 429
          ? "You've sent too many messages. Please wait a moment and try again! 🙏"
          : "Sorry, I'm having trouble connecting right now. Please try again shortly! 🔄",
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, isOpen]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    setMessages([WELCOME_MESSAGE]);
  }

  function formatContent(content) {
    // Convert newlines to <br> and preserve formatting
    return content.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        {line}
        {i < content.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  }

  function formatTime(iso) {
    try {
      return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  }

  return (
    <>
      {/* ─── Chat bubble button ─────────────────────────────────────────── */}
      <button
        className={`chatbot-bubble ${isOpen ? 'chatbot-bubble--open' : ''}`}
        onClick={() => setIsOpen(v => !v)}
        aria-label={isOpen ? 'Close travel assistant' : 'Open travel assistant'}
        title="AI Travel Assistant"
      >
        {isOpen ? (
          <span className="chatbot-bubble__icon">✕</span>
        ) : (
          <>
            <span className="chatbot-bubble__icon">🤖</span>
            {hasUnread && <span className="chatbot-bubble__badge" aria-label="New message" />}
          </>
        )}
      </button>

      {/* ─── Chat window ────────────────────────────────────────────────── */}
      {isOpen && (
        <div className="chatbot-window" role="dialog" aria-label="Travel Assistant Chat" aria-modal="false">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header__info">
              <div className="chatbot-header__avatar">🤖</div>
              <div>
                <p className="chatbot-header__name">TravelBot</p>
                <p className="chatbot-header__status">
                  <span className="chatbot-status-dot" />
                  AI Travel Assistant
                </p>
              </div>
            </div>
            <div className="chatbot-header__actions">
              <button
                className="chatbot-header__btn"
                onClick={clearChat}
                title="Clear chat"
                aria-label="Clear chat history"
              >
                🗑️
              </button>
              <button
                className="chatbot-header__btn"
                onClick={() => setIsOpen(false)}
                title="Close"
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chatbot-messages" role="log" aria-live="polite" aria-label="Chat messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chatbot-message chatbot-message--${msg.role} ${msg.isError ? 'chatbot-message--error' : ''}`}
              >
                {msg.role === 'assistant' && (
                  <div className="chatbot-message__avatar">🤖</div>
                )}
                <div className="chatbot-message__bubble">
                  <p className="chatbot-message__content">{formatContent(msg.content)}</p>
                  <span className="chatbot-message__time">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="chatbot-message chatbot-message--assistant">
                <div className="chatbot-message__avatar">🤖</div>
                <div className="chatbot-message__bubble chatbot-message__bubble--typing">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts — shown only when few messages */}
          {messages.length <= 2 && !loading && (
            <div className="chatbot-quick-prompts" aria-label="Quick suggestions">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p.text}
                  className="chatbot-quick-btn"
                  onClick={() => sendMessage(p.text)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="chatbot-input-area">
            <textarea
              ref={inputRef}
              className="chatbot-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about travel..."
              rows={1}
              maxLength={500}
              disabled={loading}
              aria-label="Type your message"
            />
            <button
              className="chatbot-send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              aria-label="Send message"
            >
              {loading ? (
                <span className="chatbot-send-spinner" />
              ) : (
                <span>➤</span>
              )}
            </button>
          </div>

          <p className="chatbot-footer">
            Powered by OpenAI · Travel data by SerpAPI
          </p>
        </div>
      )}
    </>
  );
}
