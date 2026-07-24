import {
  messageFromFunctionInvoke,
  paymentErrorIsNativeUnavailable,
  paymentErrorNeedsRebook,
  toUserFriendlyPaymentMessage,
} from '@/lib/payment-user-messages';

describe('toUserFriendlyPaymentMessage', () => {
  it('returns fallback for empty input', () => {
    expect(toUserFriendlyPaymentMessage('')).toMatch(/something went wrong/i);
    expect(toUserFriendlyPaymentMessage('   ')).toMatch(/something went wrong/i);
  });

  it('maps setup and connectivity failures', () => {
    expect(toUserFriendlyPaymentMessage('Missing EXPO_PUBLIC_RAZORPAY key')).toMatch(
      /not set up in the app/i,
    );
    expect(toUserFriendlyPaymentMessage('Edge Function returned a non-2xx status code')).toMatch(
      /could not reach the payment service/i,
    );
    expect(toUserFriendlyPaymentMessage('society payment account is not verified')).toMatch(
      /management committee/i,
    );
  });

  it('maps booking / session lifecycle errors', () => {
    expect(toUserFriendlyPaymentMessage('booking not found')).toMatch(/no longer available/i);
    expect(toUserFriendlyPaymentMessage('payment is not pending')).toMatch(/already processed/i);
    expect(toUserFriendlyPaymentMessage('payment has expired')).toMatch(/session expired/i);
    expect(toUserFriendlyPaymentMessage('timed out waiting for confirmation')).toMatch(
      /not received confirmation/i,
    );
  });

  it('maps cancel, network, and web restrictions', () => {
    expect(toUserFriendlyPaymentMessage('User cancelled payment')).toBe('Payment cancelled.');
    expect(toUserFriendlyPaymentMessage('Network request failed')).toMatch(/internet connection/i);
    expect(toUserFriendlyPaymentMessage('Payments are not available on web')).toMatch(/phone/i);
  });

  it('maps native SDK unavailable copy', () => {
    expect(toUserFriendlyPaymentMessage('razorpay_native_unavailable')).toMatch(/reinstall/i);
    expect(toUserFriendlyPaymentMessage("Cannot read property 'open' of null")).toMatch(
      /reinstall/i,
    );
  });

  it('keeps short plain English RPC messages', () => {
    expect(toUserFriendlyPaymentMessage('Slot already booked')).toBe('Slot already booked');
  });
});

describe('paymentErrorNeedsRebook', () => {
  it('flags expired / missing booking states', () => {
    expect(paymentErrorNeedsRebook('booking not found')).toBe(true);
    expect(paymentErrorNeedsRebook('payment has expired')).toBe(true);
    expect(paymentErrorNeedsRebook('payment is not pending')).toBe(true);
    expect(paymentErrorNeedsRebook('network error')).toBe(false);
  });
});

describe('paymentErrorIsNativeUnavailable', () => {
  it('detects Expo Go / missing native module failures', () => {
    expect(paymentErrorIsNativeUnavailable('razorpay_native_unavailable')).toBe(true);
    expect(paymentErrorIsNativeUnavailable("Cannot read property 'open' of null")).toBe(true);
    expect(paymentErrorIsNativeUnavailable('payment failed')).toBe(false);
  });
});

describe('messageFromFunctionInvoke', () => {
  it('prefers JSON error body from Response', async () => {
    const res = new Response(JSON.stringify({ error: 'Order creation failed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
    await expect(messageFromFunctionInvoke({ message: 'ignored' }, res)).resolves.toBe(
      'Order creation failed',
    );
  });

  it('falls back to error.message when body is not JSON', async () => {
    const res = new Response('not-json', { status: 500 });
    await expect(messageFromFunctionInvoke({ message: 'fallback msg' }, res)).resolves.toBe(
      'fallback msg',
    );
  });
});
