import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';

import { hasNativeModule } from '@/lib/native-module';
import { formatPaise } from '@/lib/ops-api';
import type { PaymentLedgerEntry, VisitorWithFlat } from '@/types/database';
import { flatLabel } from '@/lib/visitors';

type PrintModule = typeof import('expo-print');
type SharingModule = typeof import('expo-sharing');

let printModule: PrintModule | null | undefined;
let sharingModule: SharingModule | null | undefined;

async function loadPrint(): Promise<PrintModule | null> {
  if (printModule !== undefined) return printModule;
  if (!hasNativeModule('ExpoPrint')) {
    console.info('[print] ExpoPrint not in this build — run npx expo run:android');
    printModule = null;
    return null;
  }
  try {
    printModule = await import('expo-print');
    return printModule;
  } catch (e) {
    console.info('[print] unavailable — rebuild the native app:', e);
    printModule = null;
    return null;
  }
}

async function loadSharing(): Promise<SharingModule | null> {
  if (sharingModule !== undefined) return sharingModule;
  if (!hasNativeModule('ExpoSharing')) {
    sharingModule = null;
    return null;
  }
  try {
    sharingModule = await import('expo-sharing');
    return sharingModule;
  } catch (e) {
    console.info('[sharing] unavailable — rebuild the native app:', e);
    sharingModule = null;
    return null;
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function shareHtmlPdf(html: string, dialogTitle: string): Promise<void> {
  const Print = await loadPrint();
  if (!Print) {
    throw new Error('PDF needs a rebuilt Portl app. Run npx expo run:android.');
  }

  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  const Sharing = await loadSharing();
  if (Sharing && (await Sharing.isAvailableAsync())) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle,
      UTI: 'com.adobe.pdf',
    });
  } else {
    await Print.printAsync({ html });
  }
}

/** Shareable / printable visitor gate pass. */
export async function shareVisitorPassPdf(visitor: VisitorWithFlat): Promise<void> {
  const passId = visitor.id.split('-')[0]?.toUpperCase() ?? visitor.id;
  const flat = flatLabel(visitor);
  const expires = visitor.expires_at
    ? new Date(visitor.expires_at).toLocaleString()
    : 'End of visit';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, Segoe UI, sans-serif; padding: 32px; color: #0f172a; }
    .card { border: 2px solid #0F766E; border-radius: 16px; padding: 28px; max-width: 420px; margin: 0 auto; }
    h1 { margin: 0 0 4px; font-size: 22px; color: #0F766E; }
    .muted { color: #64748b; font-size: 13px; }
    .name { font-size: 26px; font-weight: 700; margin: 20px 0 6px; }
    .row { margin-top: 10px; font-size: 14px; }
    .code { margin-top: 24px; font-family: ui-monospace, monospace; letter-spacing: 0.12em;
            font-size: 18px; font-weight: 700; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Portl Visitor Pass</h1>
    <div class="muted">Show at the gate for entry</div>
    <div class="name">${esc(visitor.name)}</div>
    <div class="muted">${esc(visitor.type)} · ${esc(flat)}</div>
    <div class="row"><strong>Purpose:</strong> ${esc(visitor.purpose ?? '—')}</div>
    <div class="row"><strong>Valid until:</strong> ${esc(expires)}</div>
    <div class="code">PASS ${esc(passId)}</div>
    <div class="muted" style="text-align:center;margin-top:8px">ID: ${esc(visitor.id)}</div>
  </div>
</body>
</html>`;

  try {
    await shareHtmlPdf(html, 'Share visitor pass');
  } catch (e) {
    Toast.show({
      type: 'error',
      text1: 'Could not create pass PDF',
      text2: e instanceof Error ? e.message : undefined,
    });
  }
}

/** Shareable payment receipt PDF. */
export async function sharePaymentReceiptPdf(entry: PaymentLedgerEntry): Promise<void> {
  const purpose =
    entry.purpose === 'maintenance_due'
      ? 'Maintenance'
      : entry.purpose === 'amenity_booking'
        ? 'Amenity'
        : entry.purpose === 'fine'
          ? 'Fine'
          : String(entry.purpose);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, Segoe UI, sans-serif; padding: 32px; color: #0f172a; }
    .card { border: 1px solid #cbd5e1; border-radius: 16px; padding: 28px; max-width: 480px; margin: 0 auto; }
    h1 { margin: 0; font-size: 20px; color: #0F766E; }
    .amount { font-size: 32px; font-weight: 700; margin: 20px 0 8px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-top: 1px solid #e2e8f0; font-size: 14px; }
    .muted { color: #64748b; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Portl Payment Receipt</h1>
    <div class="muted">${esc(new Date(entry.created_at).toLocaleString())}</div>
    <div class="amount">${esc(formatPaise(entry.amount_paise))}</div>
    <div class="muted">${esc(String(entry.status))}</div>
    <div class="row"><span>Purpose</span><strong>${esc(purpose)}</strong></div>
    <div class="row"><span>Reference</span><span>${esc(entry.id.slice(0, 8).toUpperCase())}</span></div>
    ${
      entry.notes
        ? `<div class="row"><span>Notes</span><span>${esc(entry.notes)}</span></div>`
        : ''
    }
    <p class="muted" style="margin-top:24px">Generated by Portl Society Management</p>
  </div>
</body>
</html>`;

  try {
    await shareHtmlPdf(html, 'Share payment receipt');
  } catch (e) {
    Toast.show({
      type: 'error',
      text1: 'Could not create receipt',
      text2: e instanceof Error ? e.message : undefined,
    });
  }
}
