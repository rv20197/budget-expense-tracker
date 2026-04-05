const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type AttemptWindow = {
  attempts: number[];
};

const attemptsByKey = new Map<string, AttemptWindow>();

export function checkRateLimit(key: string) {
  const now = Date.now();
  const currentWindow = attemptsByKey.get(key) ?? { attempts: [] };
  const attempts = currentWindow.attempts.filter(
    (timestamp) => now - timestamp < WINDOW_MS,
  );

  if (attempts.length >= MAX_ATTEMPTS) {
    const retryAfterMs = WINDOW_MS - (now - attempts[0]);

    attemptsByKey.set(key, { attempts });

    return {
      success: false,
      retryAfterMs,
      remaining: 0,
    };
  }

  attempts.push(now);
  attemptsByKey.set(key, { attempts });

  return {
    success: true,
    retryAfterMs: 0,
    remaining: Math.max(MAX_ATTEMPTS - attempts.length, 0),
  };
}

export function resetRateLimit(key: string) {
  attemptsByKey.delete(key);
}
