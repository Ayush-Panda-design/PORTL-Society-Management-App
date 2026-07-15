import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  right?: ReactNode;
  showBack?: boolean;
};

export function ScreenHeader({ title, subtitle, children, right, showBack }: Props) {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="flex-row items-start justify-between gap-3 px-4 pb-2 pt-3">
        <View className="min-w-0 flex-1 flex-row items-start gap-2">
          {showBack ? (
            <Pressable
              onPress={() => router.back()}
              className="mt-0.5 h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white"
            >
              <ChevronLeft color="#475569" size={20} />
            </Pressable>
          ) : null}
          <View className="min-w-0 flex-1">
            <Text className="text-2xl font-bold text-slate-900" numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text className="text-sm text-slate-500" numberOfLines={2}>
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
