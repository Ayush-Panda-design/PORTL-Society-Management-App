import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PlaceholderScreenProps = {
  title: string;
  subtitle?: string;
};

export function PlaceholderScreen({ title, subtitle }: PlaceholderScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-1 justify-center px-6">
        <Text className="mb-2 text-3xl font-bold text-ink">{title}</Text>
        {subtitle ? <Text className="text-base leading-6 text-ink-muted">{subtitle}</Text> : null}
      </View>
    </SafeAreaView>
  );
}
