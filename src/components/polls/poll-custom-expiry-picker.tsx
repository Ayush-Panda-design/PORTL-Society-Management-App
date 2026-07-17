import { Calendar, Clock } from 'lucide-react-native';
import { useEffect, useState, type ComponentType } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';

import { Brand, FontFamily } from '@/constants/theme';
import { isDatePickerNativeAvailable, mergeDateAndTime } from '@/lib/poll-form';
import { formatDateTime } from '@/lib/visitors';

type DateTimePickerEvent = {
  type: string;
  nativeEvent?: { timestamp?: number };
};

type DateTimePickerProps = {
  value: Date;
  mode: 'date' | 'time' | 'datetime';
  display?: 'default' | 'spinner' | 'clock' | 'calendar';
  minimumDate?: Date;
  onChange: (event: DateTimePickerEvent, date?: Date) => void;
};

type Props = {
  value: Date;
  onChange: (next: Date) => void;
};

export function PollCustomExpiryPicker({ value, onChange }: Props) {
  const [DateTimePicker, setDateTimePicker] = useState<ComponentType<DateTimePickerProps> | null>(
    null,
  );
  const [androidMode, setAndroidMode] = useState<'date' | 'time' | null>(null);
  const available = isDatePickerNativeAvailable();

  useEffect(() => {
    if (!available) return;

    let cancelled = false;
    void (async () => {
      try {
        const mod = await import('@react-native-community/datetimepicker');
        if (!cancelled) setDateTimePicker(() => mod.default);
      } catch {
        // Native module missing until dev build is rebuilt.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [available]);

  if (!available) {
    return (
      <Text className="text-sm text-slate-500" style={{ fontFamily: FontFamily.body }}>
        Custom dates need a dev build rebuild. Use 1 day / 3 days / 1 week presets for now.
      </Text>
    );
  }

  if (!DateTimePicker) {
    return (
      <View className="items-center py-4">
        <ActivityIndicator color={Brand.primary} />
      </View>
    );
  }

  const onAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed') {
      setAndroidMode(null);
      return;
    }
    if (!selected) {
      setAndroidMode(null);
      return;
    }

    if (androidMode === 'date') {
      onChange(mergeDateAndTime(selected, value));
      setAndroidMode('time');
      return;
    }

    onChange(mergeDateAndTime(value, selected));
    setAndroidMode(null);
  };

  if (Platform.OS === 'ios') {
    return (
      <View className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        <DateTimePicker
          value={value}
          mode="datetime"
          display="spinner"
          minimumDate={new Date()}
          onChange={(_, selected) => {
            if (selected) onChange(selected);
          }}
        />
      </View>
    );
  }

  return (
    <View className="gap-2">
      <View className="flex-row gap-2">
        <Pressable
          onPress={() => setAndroidMode('date')}
          className="flex-1 flex-row items-center gap-2 rounded-xl border border-slate-200 bg-surface-card px-4 py-3"
        >
          <Calendar color={Brand.primary} size={18} />
          <View className="min-w-0 flex-1">
            <Text
              className="text-[11px] uppercase text-slate-400"
              style={{ fontFamily: FontFamily.medium }}
            >
              Date
            </Text>
            <Text className="text-base text-slate-900" style={{ fontFamily: FontFamily.heading }}>
              {value.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => setAndroidMode('time')}
          className="flex-1 flex-row items-center gap-2 rounded-xl border border-slate-200 bg-surface-card px-4 py-3"
        >
          <Clock color={Brand.primary} size={18} />
          <View className="min-w-0 flex-1">
            <Text
              className="text-[11px] uppercase text-slate-400"
              style={{ fontFamily: FontFamily.medium }}
            >
              Time
            </Text>
            <Text className="text-base text-slate-900" style={{ fontFamily: FontFamily.heading }}>
              {value.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </Pressable>
      </View>

      <Text className="text-center text-sm text-slate-500" style={{ fontFamily: FontFamily.body }}>
        Ends {formatDateTime(value.toISOString())}
      </Text>

      {androidMode ? (
        <DateTimePicker
          value={value}
          mode={androidMode}
          minimumDate={androidMode === 'date' ? new Date() : undefined}
          onChange={onAndroidChange}
        />
      ) : null}
    </View>
  );
}
