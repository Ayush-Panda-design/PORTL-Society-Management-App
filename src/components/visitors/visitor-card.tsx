import { Image } from 'expo-image';
import { Check, User, X } from 'lucide-react-native';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import {
  flatLabel,
  formatRelativeTime,
  statusColor,
  statusLabel,
  typeLabel,
} from '@/lib/visitors';
import type { VisitorWithFlat } from '@/types/database';

type Action = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'secondary';
  loading?: boolean;
  icon?: 'check' | 'x';
};

type Props = {
  visitor: VisitorWithFlat;
  actions?: Action[];
  showStatus?: boolean;
};

export function VisitorCard({ visitor, actions, showStatus = true }: Props) {
  const colors = statusColor(visitor.status);

  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-4">
      <View className="flex-row gap-3">
        <View className="h-14 w-14 overflow-hidden rounded-xl bg-slate-100">
          {visitor.photo_url ? (
            <Image
              source={{ uri: visitor.photo_url }}
              style={{ width: 56, height: 56 }}
              contentFit="cover"
            />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <User color="#94A3B8" size={24} />
            </View>
          )}
        </View>

        <View className="flex-1">
          <View className="mb-1 flex-row items-start justify-between gap-2">
            <Text className="flex-1 text-base font-semibold text-slate-900" numberOfLines={1}>
              {visitor.name}
            </Text>
            {showStatus ? (
              <View className={`rounded-full border px-2 py-0.5 ${colors.bg} ${colors.border}`}>
                <Text className={`text-xs font-medium ${colors.text}`}>
                  {statusLabel(visitor.status)}
                </Text>
              </View>
            ) : null}
          </View>

          <Text className="text-sm text-slate-600">
            {typeLabel(visitor.type)} · {flatLabel(visitor)}
          </Text>
          {visitor.purpose ? (
            <Text className="mt-0.5 text-sm text-slate-500" numberOfLines={2}>
              {visitor.purpose}
            </Text>
          ) : null}
          <Text className="mt-1 text-xs text-slate-400">
            {formatRelativeTime(visitor.created_at)}
            {visitor.phone ? ` · ${visitor.phone}` : ''}
          </Text>
        </View>
      </View>

      {actions && actions.length > 0 ? (
        <View className="mt-4 flex-row gap-2">
          {actions.map((action) => {
            const isPrimary = action.variant === 'primary' || !action.variant;
            const isDanger = action.variant === 'danger';
            const bg = isDanger
              ? 'bg-red-600'
              : isPrimary
                ? 'bg-teal-700'
                : 'bg-slate-100';
            const text = isDanger || isPrimary ? 'text-white' : 'text-slate-800';

            return (
              <Pressable
                key={action.label}
                disabled={action.loading}
                onPress={action.onPress}
                className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 ${bg} ${
                  action.loading ? 'opacity-70' : ''
                }`}
              >
                {action.loading ? (
                  <ActivityIndicator color={isDanger || isPrimary ? '#fff' : '#0F766E'} />
                ) : (
                  <>
                    {action.icon === 'check' ? (
                      <Check color={isDanger || isPrimary ? '#fff' : '#0F766E'} size={16} />
                    ) : null}
                    {action.icon === 'x' ? (
                      <X color={isDanger || isPrimary ? '#fff' : '#0F766E'} size={16} />
                    ) : null}
                    <Text className={`text-sm font-semibold ${text}`}>{action.label}</Text>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
