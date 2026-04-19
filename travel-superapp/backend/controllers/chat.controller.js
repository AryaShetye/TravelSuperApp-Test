/**
 * Chat Controller
 * POST /api/chat — AI travel assistant powered by OpenAI
 */

const { getChatResponse } = require('../services/openai.service');

// Rate limit: max 20 messages per session (tracked in-memory per IP)
const sessionCounts = new Map();
const SESSION_LIMIT = 20;
const SESSION_WINDOW_MS = 60 * 60 * 1000; // 1 hour

async function chat(req, res, next) {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.trim().length > 500) {
      return res.status(400).json({ error: 'Message too long (max 500 characters)' });
    }

    // Simple per-IP rate limiting
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const session = sessionCounts.get(ip);

    if (session && now - session.start < SESSION_WINDOW_MS) {
      if (session.count >= SESSION_LIMIT) {
        return res.status(429).json({
          error: 'Chat limit reached. Please try again in an hour.',
          reply: "You've reached the chat limit for this hour. Please try again later! 🙏",
        });
      }
      session.count++;
    } else {
      sessionCounts.set(ip, { count: 1, start: now });
    }

    // Validate history format
    const validHistory = Array.isArray(history)
      ? history.slice(-10).filter(m => m.role && m.content && typeof m.content === 'string')
      : [];

    const reply = await getChatResponse(validHistory, message.trim());

    res.json({
      reply,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { chat };
