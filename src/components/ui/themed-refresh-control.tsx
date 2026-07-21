import { RefreshControl, View, type RefreshControlProps } from 'react-native';
import { MotiView } from 'moti';

import { Brand } from '@/constants/theme';
import { useThemePalette } from '@/hooks/use-theme';

type Props = Omit<RefreshControlProps, 'tintColor' | 'colors' | 'progressBackgroundColor'>;

/**
 * Brand-tinted pull-to-refresh. Prefer this over raw RefreshControl.
 */
export function ThemedRefreshControl(props: Props) {
  const palette = useThemePalette();

  return (
    <RefreshControl
      tintColor={Brand.primary}
      colors={[Brand.primary, Brand.accent]}
      progressBackgroundColor={palette.card}
      {...props}
    />
  );
}

/** Optional branded mark shown above lists during refresh (dashboard). */
export function BrandedRefreshMark({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View className="items-center py-2">
      <MotiView
        from={{ scale: 0.85, opacity: 0.4 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'timing', duration: 500, loop: true }}
        className="h-2 w-8 rounded-full"
        style={{ backgroundColor: Brand.primary }}
      />
    </View>
  );
}
