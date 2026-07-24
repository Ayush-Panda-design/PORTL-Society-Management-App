import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';

import { hasNativeModule } from '@/lib/native-module';

type CalendarModule = typeof import('expo-calendar');

let calendarModule: CalendarModule | null | undefined;

async function loadCalendar(): Promise<CalendarModule | null> {
  if (calendarModule !== undefined) return calendarModule;
  if (Platform.OS === 'web' || !hasNativeModule('ExpoCalendar')) {
    if (Platform.OS !== 'web') {
      console.info('[calendar] ExpoCalendar not in this build — run npx expo run:android');
    }
    calendarModule = null;
    return null;
  }
  try {
    calendarModule = await import('expo-calendar');
    return calendarModule;
  } catch (e) {
    console.info('[calendar] unavailable — rebuild the native app:', e);
    calendarModule = null;
    return null;
  }
}

function parseSlotStart(dateISO: string, slot: string): Date {
  const startPart = slot.split(/[–—-]/)[0]?.trim() ?? slot;
  const base = new Date(`${dateISO}T12:00:00`);
  const match = startPart.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return base;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const ampm = match[3]?.toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  const d = new Date(dateISO);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function parseSlotEnd(dateISO: string, slot: string, start: Date): Date {
  const parts = slot.split(/[–—-]/);
  if (parts.length >= 2) {
    const endPart = parts[1]?.trim() ?? '';
    const match = endPart.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match) {
      let hours = Number(match[1]);
      const minutes = Number(match[2]);
      const ampm = match[3]?.toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      const d = new Date(dateISO);
      d.setHours(hours, minutes, 0, 0);
      if (d > start) return d;
    }
  }
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return end;
}

/** Adds an amenity booking to the device calendar. */
export async function addAmenityBookingToCalendar(params: {
  amenityName: string;
  dateISO: string;
  slot: string;
  location?: string | null;
}): Promise<boolean> {
  if (Platform.OS === 'web') {
    Toast.show({ type: 'info', text1: 'Calendar is available on the mobile app' });
    return false;
  }

  const Calendar = await loadCalendar();
  if (!Calendar) {
    Toast.show({
      type: 'info',
      text1: 'Calendar needs a rebuild',
      text2: 'Run npx expo run:android to enable Add to calendar.',
    });
    return false;
  }

  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    Toast.show({
      type: 'error',
      text1: 'Calendar permission needed',
      text2: 'Allow Portl to add bookings to your calendar.',
    });
    return false;
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable =
    calendars.find((c) => c.allowsModifications && c.isPrimary) ??
    calendars.find((c) => c.allowsModifications);

  if (!writable) {
    Toast.show({ type: 'error', text1: 'No writable calendar found' });
    return false;
  }

  const startDate = parseSlotStart(params.dateISO, params.slot);
  const endDate = parseSlotEnd(params.dateISO, params.slot, startDate);

  try {
    await Calendar.createEventAsync(writable.id, {
      title: params.amenityName,
      startDate,
      endDate,
      location: params.location ?? undefined,
      notes: `Portl amenity booking · ${params.slot}`,
      timeZone: undefined,
    });
    Toast.show({ type: 'success', text1: 'Added to calendar' });
    return true;
  } catch (e) {
    Toast.show({
      type: 'error',
      text1: 'Could not add event',
      text2: e instanceof Error ? e.message : undefined,
    });
    return false;
  }
}
