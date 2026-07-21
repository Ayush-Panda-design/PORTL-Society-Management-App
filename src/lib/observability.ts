import Constants from 'expo-constants';

import { logger, setErrorReporter } from '@/lib/logger';

let initialized = false;

/**
 * Optional crash reporting. Set EXPO_PUBLIC_SENTRY_DSN to enable @sentry/react-native.
 * Safe to call multiple times; no-ops when DSN is missing or the SDK is not installed.
 */
export function initObservability() {
  if (initialized) return;
  initialized = true;

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/react-native') as {
      init: (options: Record<string, unknown>) => void;
      captureException: (error: unknown, context?: { extra?: Record<string, unknown> }) => void;
    };

    Sentry.init({
      dsn,
      environment: __DEV__ ? 'development' : 'production',
      release: Constants.expoConfig?.version,
      tracesSampleRate: __DEV__ ? 0 : 0.2,
      enableAutoSessionTracking: true,
    });

    setErrorReporter((error, context) => {
      Sentry.captureException(error, context ? { extra: context } : undefined);
    });

    logger.info('[observability] Sentry initialized');
  } catch {
    logger.warn('[observability] EXPO_PUBLIC_SENTRY_DSN set but @sentry/react-native is not installed');
  }
}
