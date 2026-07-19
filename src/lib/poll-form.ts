import { requireOptionalNativeModule } from 'expo';
import { NativeModules, Platform } from 'react-native';

import { formatDateTime } from '@/lib/visitors';

export type PollTemplateId = 'yes_no' | 'approve' | 'agree' | 'rating' | 'custom';

export type PollDurationPreset = '1d' | '3d' | '1w' | '2w' | 'none' | 'custom';

export const POLL_TEMPLATES: {
  value: PollTemplateId;
  label: string;
  options: string[];
  placeholder: string;
}[] = [
  {
    value: 'yes_no',
    label: 'Yes / No',
    options: ['Yes', 'No'],
    placeholder: 'e.g. Should we install EV charging stations?',
  },
  {
    value: 'approve',
    label: 'Approve / Reject',
    options: ['Approve', 'Reject'],
    placeholder: 'e.g. Lobby renovation proposal',
  },
  {
    value: 'agree',
    label: 'Agree / Disagree',
    options: ['Agree', 'Disagree'],
    placeholder: 'e.g. Increase monthly maintenance by 5%',
  },
  {
    value: 'rating',
    label: 'Rating',
    options: ['Excellent', 'Good', 'Average', 'Poor'],
    placeholder: 'e.g. How was the recent society event?',
  },
  {
    value: 'custom',
    label: 'Custom',
    options: ['', ''],
    placeholder: 'Your poll question',
  },
];

export const POLL_DURATION_OPTIONS: { value: PollDurationPreset; label: string }[] = [
  { value: '1d', label: '1 day' },
  { value: '3d', label: '3 days' },
  { value: '1w', label: '1 week' },
  { value: '2w', label: '2 weeks' },
  { value: 'none', label: 'No limit' },
  { value: 'custom', label: 'Date & time' },
];

/** True when the dev build includes @react-native-community/datetimepicker native code. */
export function isDatePickerNativeAvailable(): boolean {
  if (Platform.OS === 'web') return true;
  return Boolean(
    requireOptionalNativeModule('RNCDatePicker') ??
      (NativeModules as { RNCDatePicker?: unknown }).RNCDatePicker,
  );
}

export function pollDurationOptions() {
  return POLL_DURATION_OPTIONS;
}

export function defaultCustomExpiryDate(): Date {
  const end = new Date();
  end.setDate(end.getDate() + 7);
  end.setHours(18, 0, 0, 0);
  return end;
}

export function mergeDateAndTime(datePart: Date, timePart: Date): Date {
  const merged = new Date(datePart);
  merged.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
  return merged;
}

export function computePollExpiry(
  preset: PollDurationPreset,
  customDate?: Date,
): string | null {
  if (preset === 'none') return null;

  if (preset === 'custom') {
    if (!customDate) throw new Error('Pick an end date and time.');
    if (customDate.getTime() <= Date.now()) {
      throw new Error('End time must be in the future.');
    }
    return customDate.toISOString();
  }

  const end = new Date();
  const days = { '1d': 1, '3d': 3, '1w': 7, '2w': 14 }[preset];
  end.setDate(end.getDate() + days);
  end.setHours(18, 0, 0, 0);

  if (end.getTime() <= Date.now()) {
    end.setDate(end.getDate() + 1);
    end.setHours(18, 0, 0, 0);
  }

  return end.toISOString();
}

export function describePollExpiry(
  preset: PollDurationPreset,
  customDate?: Date,
): string {
  if (preset === 'none') return 'Poll stays open until you close it manually.';
  if (preset === 'custom' && customDate) {
    return `Closes ${formatDateTime(customDate.toISOString())}`;
  }
  try {
    const iso = computePollExpiry(preset, customDate);
    return iso ? `Closes ${formatDateTime(iso)}` : 'No expiry';
  } catch {
    return 'Pick a future date and time';
  }
}

export function validatePollForm(input: {
  question: string;
  options: string[];
  duration: PollDurationPreset;
  customExpiry?: Date;
}): { question: string; options: string[]; expiresAt: string | null } {
  const question = input.question.trim();
  const options = input.options.map((o) => o.trim()).filter(Boolean);

  if (!question) throw new Error('Question is required.');
  if (options.length < 2) throw new Error('Add at least two options.');

  const expiresAt = computePollExpiry(input.duration, input.customExpiry);
  return { question, options, expiresAt };
}
