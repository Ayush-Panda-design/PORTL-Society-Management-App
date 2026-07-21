type InvokeErrorLike = {
  message?: string;
  name?: string;
  context?: unknown;
};

/** Pull `{ error: "..." }` from a failed Edge Function response. */
export async function messageFromFunctionInvoke(
  error: InvokeErrorLike | null,
  response?: Response,
): Promise<string> {
  const res =
    response ??
    (error?.context instanceof Response ? (error.context as Response) : null);

  if (res) {
    try {
      const body = (await res.clone().json()) as { error?: unknown };
      if (typeof body?.error === 'string' && body.error.trim()) {
        return body.error.trim();
      }
    } catch {
      // Body was not JSON or already consumed.
    }
  }

  return error?.message?.trim() ?? '';
}

/** Map backend / SDK text to copy suitable for residents. */
export function toUserFriendlyPaymentMessage(raw: string): string {
  const text = raw.trim();
  if (!text) {
    return 'Something went wrong with your payment. Please try again.';
  }

  const lower = text.toLowerCase();

  if (lower.includes('expo_public_razorpay') || lower.includes('missing razorpay')) {
    return 'Online payments are not set up in the app yet. Please contact your society office.';
  }
  if (lower.includes('edge function returned a non-2xx')) {
    return 'We could not reach the payment service. Please try again in a few minutes.';
  }
  if (lower.includes('society payment account is not verified')) {
    return 'Your society has not finished setting up online payments. Please contact the management committee.';
  }
  if (lower.includes('razorpay order creation failed')) {
    return 'We could not start payment with the bank. Please try again shortly.';
  }
  if (lower.includes('missing razorpay credentials on function')) {
    return 'Online payments are not configured on the server yet. Please contact your society office.';
  }
  if (lower.includes('booking not found')) {
    return 'This booking is no longer available. Close this screen and book the slot again.';
  }
  if (lower.includes('payment is not pending')) {
    return 'This payment was already processed. Close and book again if you still need the slot.';
  }
  if (lower.includes('payment has expired')) {
    return 'This payment session expired. Close and book the slot again.';
  }
  if (lower.includes('timed out waiting for confirmation')) {
    return 'We have not received confirmation from your bank yet. If money was deducted, your society will follow up.';
  }
  if (lower.includes('payment expired before confirmation')) {
    return 'Payment was not confirmed in time. If money was deducted, contact your society office.';
  }
  if (lower.includes('payment failed')) {
    return 'Your payment did not go through. You can try again.';
  }
  if (lower.includes('payments are not available on web')) {
    return 'Please use the Portl app on your phone to pay.';
  }
  if (
    lower.includes("cannot read property 'open' of null") ||
    lower.includes('razorpay_native_unavailable')
  ) {
    return 'Payments are not enabled in this app install. Reinstall the latest Portl build on your phone (a developer rebuild is required — Expo Go will not work).';
  }
  if (lower.includes('could not start payment') || lower.includes('payment order was not created')) {
    return 'We could not start your payment. Please try again.';
  }
  if (lower.includes('not authorized') || lower.includes('unauthorized')) {
    return 'Please sign in again and retry your payment.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Check your internet connection and try again.';
  }
  if (/cancel/i.test(text)) {
    return 'Payment cancelled.';
  }

  // Postgres / RPC messages that are already plain English — keep short ones as-is.
  if (text.length <= 120 && !/^[A-Z_]+$/.test(text) && !lower.includes('p_')) {
    return text;
  }

  return 'Something went wrong with your payment. Please try again or contact your society office.';
}

/** Errors where "Try again" in the same sheet usually will not help. */
export function paymentErrorNeedsRebook(raw: string): boolean {
  const lower = raw.toLowerCase();
  return (
    lower.includes('booking not found') ||
    lower.includes('payment has expired') ||
    lower.includes('payment is not pending') ||
    lower.includes('no longer available')
  );
}

export function paymentErrorIsNativeUnavailable(raw: string): boolean {
  const lower = raw.toLowerCase();
  return (
    lower.includes('razorpay_native_unavailable') ||
    lower.includes("cannot read property 'open' of null")
  );
}
