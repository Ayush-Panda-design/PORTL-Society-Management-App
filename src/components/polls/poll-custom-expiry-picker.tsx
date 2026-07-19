import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Brand, FontFamily } from '@/constants/theme';
import { formatDateTime } from '@/lib/visitors';

type Props = {
  value: Date;
  onChange: (next: Date) => void;
};

const TIME_PRESETS = [
  { label: '9:00', hour: 9, minute: 0 },
  { label: '12:00', hour: 12, minute: 0 },
  { label: '15:00', hour: 15, minute: 0 },
  { label: '18:00', hour: 18, minute: 0 },
  { label: '21:00', hour: 21, minute: 0 },
] as const;

function startOfDay(d: Date): Date {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildDateOptions(from: Date, days: number): Date[] {
  const start = startOfDay(from);
  const options: Date[] = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    options.push(d);
  }
  return options;
}

function withDate(base: Date, day: Date): Date {
  const next = new Date(base);
  next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
  return next;
}

function withTime(base: Date, hour: number, minute: number): Date {
  const next = new Date(base);
  next.setHours(hour, minute, 0, 0);
  return next;
}

function clampFuture(next: Date): Date {
  const min = new Date(Date.now() + 60_000);
  return next.getTime() < min.getTime() ? min : next;
}

function Stepper({
  label,
  display,
  onMinus,
  onPlus,
}: {
  label: string;
  display: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View className="flex-1 items-center rounded-xl border border-slate-200 bg-white px-2 py-2">
      <Text
        className="mb-1 text-[11px] uppercase text-slate-400"
        style={{ fontFamily: FontFamily.medium }}
      >
        {label}
      </Text>
      <Pressable
        onPress={onPlus}
        hitSlop={8}
        className="h-9 w-full items-center justify-center rounded-lg bg-slate-50"
        accessibilityLabel={`Increase ${label}`}
      >
        <ChevronUp color={Brand.primary} size={18} />
      </Pressable>
      <Text
        className="py-1 text-2xl text-slate-900"
        style={{ fontFamily: FontFamily.heading }}
      >
        {display}
      </Text>
      <Pressable
        onPress={onMinus}
        hitSlop={8}
        className="h-9 w-full items-center justify-center rounded-lg bg-slate-50"
        accessibilityLabel={`Decrease ${label}`}
      >
        <ChevronDown color={Brand.primary} size={18} />
      </Pressable>
    </View>
  );
}

/**
 * Pure JS date + time picker. Avoids Android's native DateTimePicker dialog,
 * which gets stuck when opened inside a React Native Modal.
 */
export function PollCustomExpiryPicker({ value, onChange }: Props) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const dateOptions = useMemo(() => buildDateOptions(today, 21), [today]);

  const hour = value.getHours();
  const minute = value.getMinutes();

  return (
    <View className="gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <View>
        <Text className="mb-1 text-sm text-slate-800" style={{ fontFamily: FontFamily.heading }}>
          1. Date
        </Text>
        <Text className="mb-2 text-xs text-slate-500" style={{ fontFamily: FontFamily.body }}>
          Pick the day the poll should close
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 4 }}
        >
          {dateOptions.map((day) => {
            const selected = sameDay(day, value);
            const label = day.toLocaleDateString(undefined, {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            });
            return (
              <Pressable
                key={day.toISOString()}
                onPress={() => onChange(clampFuture(withDate(value, day)))}
                className={`rounded-xl px-3 py-2.5 ${
                  selected ? 'bg-brand-700' : 'border border-slate-200 bg-white'
                }`}
              >
                <Text
                  className={`text-sm ${selected ? 'text-white' : 'text-slate-800'}`}
                  style={{ fontFamily: FontFamily.heading }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View className="border-t border-slate-200 pt-3">
        <Text className="mb-1 text-sm text-slate-800" style={{ fontFamily: FontFamily.heading }}>
          2. Time
        </Text>
        <Text className="mb-2 text-xs text-slate-500" style={{ fontFamily: FontFamily.body }}>
          Choose a quick time, or fine-tune hour and minute
        </Text>

        <View className="mb-3 flex-row flex-wrap gap-2">
          {TIME_PRESETS.map((preset) => {
            const selected = hour === preset.hour && minute === preset.minute;
            return (
              <Pressable
                key={preset.label}
                onPress={() =>
                  onChange(clampFuture(withTime(value, preset.hour, preset.minute)))
                }
                className={`rounded-full px-3 py-1.5 ${
                  selected ? 'bg-brand-700' : 'border border-slate-200 bg-white'
                }`}
              >
                <Text
                  className={`text-sm ${selected ? 'text-white' : 'text-slate-700'}`}
                  style={{ fontFamily: FontFamily.heading }}
                >
                  {preset.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="flex-row gap-3">
          <Stepper
            label="Hour"
            display={String(hour).padStart(2, '0')}
            onMinus={() =>
              onChange(clampFuture(withTime(value, (hour + 23) % 24, minute)))
            }
            onPlus={() =>
              onChange(clampFuture(withTime(value, (hour + 1) % 24, minute)))
            }
          />
          <Stepper
            label="Minute"
            display={String(minute).padStart(2, '0')}
            onMinus={() =>
              onChange(clampFuture(withTime(value, hour, (minute + 55) % 60)))
            }
            onPlus={() =>
              onChange(clampFuture(withTime(value, hour, (minute + 5) % 60)))
            }
          />
        </View>
      </View>

      <Text
        className="text-center text-sm text-slate-700"
        style={{ fontFamily: FontFamily.heading }}
      >
        Closes {formatDateTime(value.toISOString())}
      </Text>
    </View>
  );
}
