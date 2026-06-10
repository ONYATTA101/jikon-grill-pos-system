type LoginAttempt = {
  failures: number;
  windowStartedAt: number;
  blockedUntil: number;
};

const attemptWindowMs = 15 * 60 * 1000;
const blockDurationMs = 15 * 60 * 1000;
const maxFailures = 5;

const globalForLoginAttempts = globalThis as unknown as {
  loginAttempts?: Map<string, LoginAttempt>;
};

const loginAttempts = globalForLoginAttempts.loginAttempts ?? new Map<string, LoginAttempt>();
globalForLoginAttempts.loginAttempts = loginAttempts;

/**
 * Checks recent failed login attempts and temporarily blocks repeated password guessing.
 */
export function checkLoginAllowed(key: string) {
  const now = Date.now();
  const attempt = loginAttempts.get(key);

  if (!attempt || now - attempt.windowStartedAt > attemptWindowMs) {
    loginAttempts.delete(key);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (attempt.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((attempt.blockedUntil - now) / 1000)
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Records a failed login attempt and increases the temporary lockout delay when necessary.
 */
export function recordLoginFailure(key: string) {
  const now = Date.now();
  const current = loginAttempts.get(key);
  const attempt =
    current && now - current.windowStartedAt <= attemptWindowMs
      ? current
      : {
          failures: 0,
          windowStartedAt: now,
          blockedUntil: 0
        };

  attempt.failures += 1;
  if (attempt.failures >= maxFailures) {
    attempt.blockedUntil = now + blockDurationMs;
  }

  loginAttempts.set(key, attempt);
}

/**
 * Clears failed-attempt history after a user signs in successfully.
 */
export function clearLoginFailures(key: string) {
  loginAttempts.delete(key);
}
