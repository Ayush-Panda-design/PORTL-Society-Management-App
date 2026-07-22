import type { ReactNode } from 'react';
import { Pressable, Text, View, type ViewProps } from 'react-native';

import { FontFamily } from '@/constants/theme';
import { useThemePalette } from '@/hooks/use-theme';

type Props = ViewProps & {
  title: string;
  subtitle?: string;
  meta?: string;
  /** Colored left rail — status/category scan cue. */
  accentColor?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  /** Hide bottom hairline (last row). */
  last?: boolean;
  accessibilityLabel?: string;
};

/**
 * Flat ops list row — no floating card shadow.
 * Linear/Stripe-style: canvas + hairline + optional left accent.
 */
export function ListRow({
  title,
  subtitle,
  meta,
  accentColor,
  leading,
  trailing,
  onPress,
  last = false,
  accessibilityLabel,
  style,
  ...rest
}: Props) {
  const { border, isDark } = useThemePalette();
  const showDivider = !last && !isDark;

  const body = (
    <View
      {...rest}
      className="flex-row items-center gap-3 bg-surface px-4 py-3.5"
      style={[
        {
          borderBottomWidth: showDivider ? StyleSheetHairline : 0,
          borderBottomColor: border,
          borderLeftWidth: accentColor ? 3 : 0,
          borderLeftColor: accentColor ?? 'transparent',
        },
        style,
      ]}
    >
      {leading}
      <View className="min-w-0 flex-1">
        <Text
          className="text-[15px] text-ink"
          numberOfLines={1}
          style={{ fontFamily: FontFamily.heading }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-0.5 text-xs text-ink-soft" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text className="mt-0.5 text-xs text-ink-muted" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      className="active:opacity-80"
    >
      {body}
    </Pressable>
  );
}

const StyleSheetHairline = 1;
