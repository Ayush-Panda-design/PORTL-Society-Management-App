process.env.EXPO_PUBLIC_SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

jest.mock('@/lib/push-notifications', () => ({
  registerForPushNotifications: jest.fn(),
  clearPushToken: jest.fn(),
  configurePushPresentation: jest.fn(),
  invokeSendPush: jest.fn().mockResolvedValue({ ok: true, sent: 1 }),
  loadNotifications: jest.fn().mockResolvedValue(null),
}));
