import { Text, View } from 'react-native';
import { Inbox } from 'lucide-react-native';
import type { ComponentType } from 'react';

type IconProps = { color: string; size: number };

type Props = {
  title: string;
  subtitle?: string;
  Icon?: ComponentType<IconProps>;
};

export function EmptyState({ title, subtitle, Icon = Inbox }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-slate-100">
        <Icon color="#64748B" size={28} />
      </View>
      <Text className="mb-2 text-center text-lg font-semibold text-slate-800">{title}</Text>
      {subtitle ? (
        <Text className="text-center text-sm leading-5 text-slate-500">{subtitle}</Text>
      ) : null}
    </View>
  );
}
