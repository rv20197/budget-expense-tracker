type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const SENSITIVE_KEYS = new Set([
  "password",
  "confirmpassword",
  "newpassword",
  "currentpassword",
  "token",
  "secret",
  "accesstoken",
  "refreshtoken",
  "authorization",
  "cookie",
]);

function getMinLogLevel(): LogLevel {
  const isProduction = process.env.NODE_ENV === "production";
  return isProduction ? "info" : "debug";
}

function shouldLog(level: LogLevel): boolean {
  const minLevel = getMinLogLevel();
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
}

function sanitize(val: unknown): unknown {
  if (val === null || val === undefined) return val;

  if (typeof val === "object") {
    if (Array.isArray(val)) {
      return val.map(sanitize);
    }
    const cleanObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(val as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        cleanObj[key] = "[REDACTED]";
      } else {
        cleanObj[key] = sanitize(value);
      }
    }
    return cleanObj;
  }

  return val;
}

function formatLog(level: LogLevel, context: string, message: string, data?: unknown) {
  if (!shouldLog(level)) {
    return;
  }

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${context}]`;
  if (data !== undefined) {
    const safeData = sanitize(data);
    console.log(`${prefix} ${message}`, typeof safeData === "object" ? JSON.stringify(safeData) : safeData);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

export const logger = {
  info: (context: string, message: string, data?: unknown) => formatLog("info", context, message, data),
  warn: (context: string, message: string, data?: unknown) => formatLog("warn", context, message, data),
  error: (context: string, message: string, data?: unknown) => formatLog("error", context, message, data),
  debug: (context: string, message: string, data?: unknown) => formatLog("debug", context, message, data),
};
