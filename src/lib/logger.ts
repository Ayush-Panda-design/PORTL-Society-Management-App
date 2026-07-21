type ErrorReporter = (error: unknown, context?: Record<string, unknown>) => void;

let errorReporter: ErrorReporter | null = null;

/** Wire Sentry (or another backend) in production via initObservability(). */
export function setErrorReporter(reporter: ErrorReporter | null) {
  errorReporter = reporter;
}

function serializeContext(context?: Record<string, unknown>) {
  if (!context || Object.keys(context).length === 0) return undefined;
  return context;
}

export const logger = {
  debug(...args: unknown[]) {
    if (__DEV__) console.log(...args);
  },

  info(...args: unknown[]) {
    if (__DEV__) console.info(...args);
  },

  warn(message: string, context?: Record<string, unknown>) {
    if (__DEV__) console.warn(message, serializeContext(context));
  },

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    if (__DEV__) console.error(message, error, serializeContext(context));
    errorReporter?.(error ?? new Error(message), { message, ...context });
  },
};
