import * as Haptics from 'expo-haptics';
import { Check, ChevronDown } from 'lucide-react-native';
import { useCallback, useState, type ReactNode } from 'react';
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
} from 'react-native-reanimated';

import { Brand, FontFamily } from '@/constants/theme';
import { useThemePalette } from '@/hooks/use-theme';

export type ChipOption<T extends string = string> = {
  value: T;
  label: string;
  /** Optional leading icon for tiles presentation */
  icon?: ReactNode;
};

type Props<T extends string> = {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /**
   * auto → sheet when >6 options, else Material filter chips.
   * filter → always scrolling filter chips (status bars).
   * tiles → 2-column choice cards (visitor type / short form sets).
   * sheet → bottom-sheet radio list (categories, assignees).
   */
  presentation?: 'auto' | 'filter' | 'tiles' | 'sheet';
  style?: StyleProp<ViewStyle>;
  className?: string;
  title?: string;
};

const SHEET_THRESHOLD = 6;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function usePressScale() {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return {
    style,
    onPressIn: () => {
      scale.value = withSpring(0.96, { damping: 16, stiffness: 360 });
    },
    onPressOut: () => {
      scale.value = withSpring(1, { damping: 14, stiffness: 280 });
    },
  };
}

/** Material 3–style filter/choice chip: outline idle, soft fill + check when selected. */
function FilterChip<T extends string>({
  option,
  selected,
  onSelect,
}: {
  option: ChipOption<T>;
  selected: boolean;
  onSelect: (value: T) => void;
}) {
  const press = usePressScale();
  const palette = useThemePalette();

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={() => onSelect(option.value)}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 6,
          borderRadius: 999,
          paddingHorizontal: selected ? 12 : 14,
          paddingVertical: 9,
          minHeight: 40,
          backgroundColor: selected ? palette.primarySoft : palette.card,
          borderWidth: 1.5,
          borderColor: selected ? Brand.primary : palette.border,
        },
        press.style,
      ]}
    >
      {selected ? <Check color={Brand.primary} size={14} strokeWidth={2.75} /> : null}
      <Text
        style={{
          fontFamily: FontFamily.heading,
          fontSize: 13,
          color: selected ? palette.primarySoftText : palette.inkSoft,
        }}
      >
        {option.label}
      </Text>
    </AnimatedPressable>
  );
}

function FilterChipRow<T extends string>({
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
      style={[{ flexGrow: 0 }, style]}
      contentContainerStyle={{
        gap: 8,
        paddingVertical: 2,
        paddingRight: 8,
        alignItems: 'center',
      }}
    >
      {options.map((option) => (
        <FilterChip
          key={option.value}
          option={option}
          selected={option.value === value}
          onSelect={onSelect}
        />
      ))}
    </ScrollView>
  );
}

/** MyGate / form-style 2×N choice tiles — better than chips for 2–4 labelled options. */
function ChoiceTiles<T extends string>({
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
    <View className={`flex-row flex-wrap gap-2.5 ${className}`} style={style}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <ChoiceTile
            key={option.value}
            option={option}
            selected={selected}
            onSelect={onSelect}
          />
        );
      })}
    </View>
  );
}

function ChoiceTile<T extends string>({
  option,
  selected,
  onSelect,
}: {
  option: ChipOption<T>;
  selected: boolean;
  onSelect: (value: T) => void;
}) {
  const press = usePressScale();
  const palette = useThemePalette();

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={() => onSelect(option.value)}
      style={[
        {
          width: '48%',
          borderRadius: 14,
          paddingVertical: 14,
          paddingHorizontal: 12,
          backgroundColor: selected ? palette.primarySoft : palette.card,
          borderWidth: 1.5,
          borderColor: selected ? Brand.primary : palette.border,
        },
        press.style,
      ]}
    >
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          {option.icon ? <View>{option.icon}</View> : null}
          <Text
            numberOfLines={1}
            style={{
              fontFamily: FontFamily.heading,
              fontSize: 14,
              color: selected ? palette.primarySoftText : palette.ink,
            }}
          >
            {option.label}
          </Text>
        </View>
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: selected ? 0 : 1.5,
            borderColor: palette.inkFaint,
            backgroundColor: selected ? Brand.primary : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selected ? <Check color="#fff" size={12} strokeWidth={3} /> : null}
        </View>
      </View>
    </AnimatedPressable>
  );
}

/** Zomato/Swiggy-style list picker: field trigger + radio rows in a sheet. */
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
  const palette = useThemePalette();
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
        onPress={() => {
          void Haptics.selectionAsync();
          setOpen(true);
        }}
        className="flex-row items-center justify-between rounded-2xl border border-surface-border bg-surface-card px-4 py-3.5"
        style={{
          shadowColor: palette.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: palette.isDark ? 0.35 : 0.04,
          shadowRadius: 4,
          elevation: 1,
        }}
      >
        <View className="min-w-0 flex-1">
          {title ? (
            <Text
              className="mb-0.5 text-[11px] uppercase tracking-wide text-ink-muted"
              style={{ fontFamily: FontFamily.medium }}
            >
              {title}
            </Text>
          ) : null}
          <Text
            className="text-base text-ink"
            style={{ fontFamily: FontFamily.heading }}
            numberOfLines={1}
          >
            {selectedLabel}
          </Text>
        </View>
        <View className="h-8 w-8 items-center justify-center rounded-full bg-surface-muted">
          <ChevronDown color={palette.inkMuted} size={18} />
        </View>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/45">
          <Pressable className="absolute inset-0" onPress={() => setOpen(false)} />
          <View className="max-h-[72%] rounded-t-3xl bg-surface-card pb-10 pt-2">
            <View className="mb-1 items-center px-4 pt-1">
              <View className="mb-3 h-1 w-10 rounded-full bg-surface-muted" />
              <Text className="mb-2 self-start text-lg text-ink" style={{ fontFamily: FontFamily.display }}>
                {title ?? 'Choose one'}
              </Text>
            </View>
            <ScrollView bounces={false}>
              {options.map((option, i) => {
                const selected = option.value === value;
                return (
                  <View key={option.value}>
                    {i > 0 ? <View className="mx-4 h-px bg-surface-border" /> : null}
                    <Pressable
                      onPress={() => pick(option.value)}
                      className="flex-row items-center justify-between px-5 py-4"
                    >
                      <Text
                        style={{
                          fontFamily: selected ? FontFamily.heading : FontFamily.body,
                          fontSize: 16,
                          color: palette.ink,
                        }}
                      >
                        {option.label}
                      </Text>
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          borderWidth: selected ? 0 : 1.5,
                          borderColor: palette.inkFaint,
                          backgroundColor: selected ? Brand.primary : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {selected ? <Check color="#fff" size={13} strokeWidth={3} /> : null}
                      </View>
                    </Pressable>
                  </View>
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
        : 'filter'
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

  if (mode === 'tiles') {
    return (
      <ChoiceTiles
        options={options}
        value={value}
        onSelect={select}
        style={style}
        className={className}
      />
    );
  }

  return (
    <FilterChipRow
      options={options}
      value={value}
      onSelect={select}
      style={style}
      className={className}
    />
  );
}
