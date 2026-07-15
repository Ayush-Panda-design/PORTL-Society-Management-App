import { Pressable, Text, View } from 'react-native';

type Props = {
  message: string;
  onRetry?: () => void;
};

export function ErrorBanner({ message, onRetry }: Props) {
  return (
    <View className="mx-4 mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
      <Text className="text-sm text-red-700">{message}</Text>
      {onRetry ? (
        <Pressable className="mt-2 self-start" onPress={onRetry}>
          <Text className="text-sm font-semibold text-red-800">Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
