import * as Haptics from 'expo-haptics';
import { Check, ChevronDown } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Brand, FontFamily } from '@/constants/theme';

export type ChipOption<T extends string = string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** auto: chips until >6 options, then sheet. Default auto. */
  presentation?: 'chips' | 'sheet' | 'auto';
  style?: StyleProp<ViewStyle>;
  className?: string;
  /** Optional label shown above / on the sheet trigger */
  title?: string;
};

const SHEET_THRESHOLD = 6;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function Chip<T extends string>({
  option,
  selected,
  onSelect,
}: {
  option: ChipOption<T>;
  selected: boolean;
  onSelect: (value: T) => void;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPressIn={() => {
        scale.value = withSpring(0.94, { damping: 16, stiffness: 320 });
        opacity.value = withTiming(0.85, { duration: 80 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 280 });
        opacity.value = withTiming(1, { duration: 120 });
      }}
      onPress={() => onSelect(option.value)}
      style={[
        {
          borderRadius: 999,
          paddingHorizontal: 14,
          paddingVertical: 8,
          backgroundColor: selected ? Brand.primary : '#E8EEF3',
        },
        animatedStyle,
      ]}
    >
      <Text
        style={{
          fontFamily: FontFamily.heading,
          fontSize: 13,
          color: selected ? '#FFFFFF' : Brand.inkSoft,
        }}
      >
        {option.label}
      </Text>
    </AnimatedPressable>
  );
}

function ChipRow<T extends string>({
  options,
  value,
  onSelect,
  style,
  className = '',
}: {
  options: ChipOption<T>[];
  value: T;
  onSelect: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  className?: string;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className={className}
      style={style}
      contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
    >
      {options.map((option) => (
        <Chip
          key={option.value}
          option={option}
          selected={option.value === value}
          onSelect={onSelect}
        />
      ))}
    </ScrollView>
  );
}

function RadioSheet<T extends string>({
  options,
  value,
  onChange,
  title,
  style,
  className = '',
}: {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  title?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label ?? 'Select';

  const pick = (next: T) => {
    if (next !== value) {
      void Haptics.selectionAsync();
      onChange(next);
    }
    setOpen(false);
  };

  return (
    <View className={className} style={style}>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-2xl bg-surface-muted px-4 py-3"
      >
        <View className="min-w-0 flex-1">
          {title ? (
            <Text className="mb-0.5 text-xs text-ink-muted" style={{ fontFamily: FontFamily.medium }}>
              {title}
            </Text>
          ) : null}
          <Text className="text-base text-ink" style={{ fontFamily: FontFamily.heading }} numberOfLines={1}>
            {selectedLabel}
          </Text>
        </View>
        <ChevronDown color={Brand.inkMuted} size={18} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <Pressable className="absolute inset-0" onPress={() => setOpen(false)} />
          <View className="max-h-[70%] rounded-t-3xl bg-white px-2 pb-10 pt-3">
            <View className="mb-3 items-center">
              <View className="mb-3 h-1 w-10 rounded-full bg-slate-200" />
              <Text className="text-lg text-ink" style={{ fontFamily: FontFamily.display }}>
                {title ?? 'Choose one'}
              </Text>
            </View>
            <ScrollView>
              {options.map((option) => {
                const selected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => pick(option.value)}
                    className="flex-row items-center justify-between px-4 py-3.5"
                    style={{
                      backgroundColor: selected ? Brand.primarySoft : 'transparent',
                      borderRadius: 14,
                      marginHorizontal: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: selected ? FontFamily.heading : FontFamily.body,
                        fontSize: 16,
                        color: Brand.ink,
                      }}
                    >
                      {option.label}
                    </Text>
                    {selected ? <Check color={Brand.primary} size={20} strokeWidth={2.5} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function ChipSelector<T extends string>({
  options,
  value,
  onChange,
  presentation = 'auto',
  style,
  className,
  title,
}: Props<T>) {
  const mode =
    presentation === 'auto'
      ? options.length > SHEET_THRESHOLD
        ? 'sheet'
        : 'chips'
      : presentation;

  const select = useCallback(
    (next: T) => {
      if (next === value) return;
      void Haptics.selectionAsync();
      onChange(next);
    },
    [onChange, value],
  );

  if (mode === 'sheet') {
    return (
      <RadioSheet
        options={options}
        value={value}
        onChange={onChange}
        title={title}
        style={style}
        className={className}
      />
    );
  }

  return (
    <ChipRow
      options={options}
      value={value}
      onSelect={select}
      style={style}
      className={className}
    />
  );
}
