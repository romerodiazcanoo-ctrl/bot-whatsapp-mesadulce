const LOG_LEVEL = process.env["LOG_LEVEL"] ?? "info";
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const current = LEVELS[LOG_LEVEL as keyof typeof LEVELS] ?? LEVELS.info;

function format(level: string, message: string, meta?: unknown): string {
  const ts = new Date().toISOString();
  const metaStr = meta !== undefined ? ` ${JSON.stringify(meta)}` : "";
  return `[${ts}] ${level.toUpperCase().padEnd(5)} ${message}${metaStr}`;
}

export const logger = {
  error: (msg: string, meta?: unknown) => {
    if (current >= LEVELS.error) console.error(format("error", msg, meta));
  },
  warn: (msg: string, meta?: unknown) => {
    if (current >= LEVELS.warn) console.warn(format("warn", msg, meta));
  },
  info: (msg: string, meta?: unknown) => {
    if (current >= LEVELS.info) console.info(format("info", msg, meta));
  },
  debug: (msg: string, meta?: unknown) => {
    if (current >= LEVELS.debug) console.debug(format("debug", msg, meta));
  },
};
