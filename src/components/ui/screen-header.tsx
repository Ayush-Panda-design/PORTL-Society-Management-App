import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FontFamily } from '@/constants/theme';
import { useThemePalette } from '@/hooks/use-theme';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  right?: ReactNode;
  showBack?: boolean;
};

export function ScreenHeader({ title, subtitle, children, right, showBack }: Props) {
  const router = useRouter();
  const palette = useThemePalette();

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-start justify-between gap-3 px-5 pb-3 pt-4">
        <View className="min-w-0 flex-1 flex-row items-start gap-3">
          {showBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/');
                }
              }}
              className="mt-0.5 h-11 w-11 items-center justify-center rounded-full bg-surface-card"
              style={{
                shadowColor: palette.shadow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: palette.isDark ? 0.35 : 0.06,
                shadowRadius: 10,
                elevation: 2,
              }}
            >
              <ChevronLeft color={palette.ink} size={22} />
            </Pressable>
          ) : null}
          <View className="min-w-0 flex-1 pt-0.5">
            <Text
              className="text-[28px] text-ink tracking-tight"
              numberOfLines={1}
              style={{ fontFamily: FontFamily.display }}
              accessibilityRole="header"
            >
              {title}
            </Text>
            {subtitle ? (
              <Text className="mt-1 text-[15px] leading-5 text-ink-muted" numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        {right}
      </View>
      {children}
    </SafeAreaView>
  );
}
