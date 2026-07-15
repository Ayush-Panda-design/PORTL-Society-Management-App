import { ActivityIndicator, Text, View } from 'react-native';

type Props = {
  message?: string;
};

export function LoadingState({ message = 'Loading…' }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      <ActivityIndicator size="large" color="#0F766E" />
      <Text className="mt-3 text-sm text-slate-500">{message}</Text>
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View className="gap-3 px-4 py-2">
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          className="animate-pulse rounded-2xl border border-slate-100 bg-white p-4"
        >
          <View className="mb-3 h-4 w-1/3 rounded bg-slate-200" />
          <View className="mb-2 h-3 w-2/3 rounded bg-slate-100" />
          <View className="h-3 w-1/2 rounded bg-slate-100" />
        </View>
      ))}
    </View>
  );
}
