#!/usr/bin/env node
/**
 * Optional Deno typecheck for Edge Functions.
 * Skips cleanly when Deno is not installed.
 */
const { spawnSync } = require('child_process');

const files = [
  'supabase/functions/send-push/index.ts',
  'supabase/functions/dispatch-push-outbox/index.ts',
  'supabase/functions/create-razorpay-order/index.ts',
  'supabase/functions/razorpay-webhook/index.ts',
  'supabase/functions/ask-portl/index.ts',
  'supabase/functions/triage-complaint/index.ts',
];

const which = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['deno'], {
  encoding: 'utf8',
});
if (which.status !== 0) {
  console.warn('deno not installed — skip typecheck:functions');
  process.exit(0);
}

const result = spawnSync('deno', ['check', ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
