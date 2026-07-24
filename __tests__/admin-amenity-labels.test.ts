import {
  adminBookingFlatLabel,
  isOfflinePaymentTxnId,
  paymentMethodLabel,
  paymentStatusPillStyle,
} from '@/lib/admin-amenity-labels';
import type { AdminAmenityBookingView } from '@/types/database';

function booking(overrides: Partial<AdminAmenityBookingView> = {}): AdminAmenityBookingView {
  return {
    id: 'b1',
    tower_name: 'Cedar',
    flat_number: '12A',
    ...overrides,
  } as AdminAmenityBookingView;
}

describe('admin-amenity-labels', () => {
  it('formats flat labels with tower when available', () => {
    expect(adminBookingFlatLabel(booking())).toBe('Cedar · Flat 12A');
    expect(adminBookingFlatLabel(booking({ tower_name: null }))).toBe('Flat 12A');
    expect(adminBookingFlatLabel(booking({ tower_name: null, flat_number: null }))).toBe('Flat');
  });

  it('maps payment status pill colors', () => {
    expect(paymentStatusPillStyle('confirmed').text).toBe('#065F46');
    expect(paymentStatusPillStyle('partially_paid').text).toBe('#92400E');
    expect(paymentStatusPillStyle('pending_payment').text).toBe('#3730A3');
    expect(paymentStatusPillStyle('failed').bg).toBe('#FEE2E2');
    expect(paymentStatusPillStyle('expired').bg).toBe('#FEE2E2');
    expect(paymentStatusPillStyle('refunded').text).toBe('#374151');
    expect(paymentStatusPillStyle(null).text).toBe('#6B7280');
  });

  it('detects offline txn ids and payment method labels', () => {
    expect(isOfflinePaymentTxnId('offline:cash-1')).toBe(true);
    expect(isOfflinePaymentTxnId('pay_abc')).toBe(false);
    expect(isOfflinePaymentTxnId(null)).toBe(false);

    expect(paymentMethodLabel(null)).toBe('—');
    expect(paymentMethodLabel('offline:upi')).toBe('Offline (cash/UPI)');
    expect(paymentMethodLabel('pay_razor_123')).toBe('Razorpay');
  });
});
