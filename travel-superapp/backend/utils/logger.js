/**
 * Simple logger utility
 * In production, replace with Winston or Pino
 */

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL] ?? LOG_LEVELS.info;

function formatMessage(level, message, meta) {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

const logger = {
  error: (msg, meta) => {
    if (currentLevel >= LOG_LEVELS.error) console.error(formatMessage('error', msg, meta));
  },
  warn: (msg, meta) => {
    if (currentLevel >= LOG_LEVELS.warn) console.warn(formatMessage('warn', msg, meta));
  },
  info: (msg, meta) => {
    if (currentLevel >= LOG_LEVELS.info) console.log(formatMessage('info', msg, meta));
  },
  debug: (msg, meta) => {
    if (currentLevel >= LOG_LEVELS.debug) console.log(formatMessage('debug', msg, meta));
  },
};

module.exports = logger;
