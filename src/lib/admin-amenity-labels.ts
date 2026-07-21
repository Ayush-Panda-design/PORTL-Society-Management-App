import type { AdminAmenityBookingView } from '@/types/database';

export function adminBookingFlatLabel(row: AdminAmenityBookingView): string {
  if (row.tower_name && row.flat_number) {
    return `${row.tower_name} · Flat ${row.flat_number}`;
  }
  if (row.flat_number) return `Flat ${row.flat_number}`;
  return 'Flat';
}

export function paymentStatusPillStyle(status: string | null | undefined): {
  bg: string;
  text: string;
} {
  switch (status) {
    case 'confirmed':
      return { bg: '#D1FAE5', text: '#065F46' };
    case 'partially_paid':
      return { bg: '#FEF3C7', text: '#92400E' };
    case 'pending_payment':
      return { bg: '#E0E7FF', text: '#3730A3' };
    case 'failed':
    case 'expired':
      return { bg: '#FEE2E2', text: '#991B1B' };
    case 'refunded':
      return { bg: '#F3F4F6', text: '#374151' };
    default:
      return { bg: '#F3F4F6', text: '#6B7280' };
  }
}

export function isOfflinePaymentTxnId(id: string | null | undefined): boolean {
  return Boolean(id?.startsWith('offline:'));
}

export function paymentMethodLabel(razorpayPaymentId: string | null | undefined): string {
  if (!razorpayPaymentId) return '—';
  if (isOfflinePaymentTxnId(razorpayPaymentId)) return 'Offline (cash/UPI)';
  return 'Razorpay';
}
