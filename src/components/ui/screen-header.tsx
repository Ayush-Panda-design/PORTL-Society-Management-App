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
      <View className="flex-row items-start justify-between gap-3 px-4 pb-2 pt-3">
        <View className="min-w-0 flex-1 flex-row items-start gap-2">
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
              className="mt-0.5 h-9 w-9 items-center justify-center rounded-full border border-surface-border bg-surface-card"
            >
              <ChevronLeft color={palette.inkMuted} size={20} />
            </Pressable>
          ) : null}
          <View className="min-w-0 flex-1">
            <Text
              className="text-2xl text-ink"
              numberOfLines={1}
              style={{ fontFamily: FontFamily.display }}
              accessibilityRole="header"
            >
              {title}
            </Text>
            {subtitle ? (
              <Text className="text-sm text-ink-muted" numberOfLines={2}>
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
