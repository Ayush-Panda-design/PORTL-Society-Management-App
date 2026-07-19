import { Image } from 'expo-image';
import { Check, CheckCircle2, Clock3, LogIn, LogOut, X, XCircle, QrCode } from 'lucide-react-native';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { VisitorSilhouette } from '@/components/illustrations';
import { Brand, FontFamily } from '@/constants/theme';
import {
  flatLabel,
  formatRelativeTime,
  statusColor,
  statusLabel,
  typeLabel,
} from '@/lib/visitors';
import type { VisitorStatus, VisitorWithFlat } from '@/types/database';

type Action = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'secondary';
  loading?: boolean;
  icon?: 'check' | 'x' | 'qr-code';
};

type Props = {
  visitor: VisitorWithFlat;
  actions?: Action[];
  showStatus?: boolean;
};

function StatusIcon({ status, color }: { status: VisitorStatus; color: string }) {
  switch (status) {
    case 'pending':
      return <Clock3 color={color} size={12} />;
    case 'approved':
      return <CheckCircle2 color={color} size={12} />;
    case 'rejected':
      return <XCircle color={color} size={12} />;
    case 'checked_in':
      return <LogIn color={color} size={12} />;
    case 'checked_out':
      return <LogOut color={color} size={12} />;
    default:
      return null;
  }
}

export function VisitorCard({ visitor, actions, showStatus = true }: Props) {
  const colors = statusColor(visitor.status);

  return (
    <View
      className="rounded-2xl border border-surface-border bg-surface-card p-4"
      style={{
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
      }}
    >
      <View className="flex-row gap-3">
        <View className="h-14 w-14 overflow-hidden rounded-xl bg-brand-50">
          {visitor.photo_url ? (
            <Image
              source={{ uri: visitor.photo_url }}
              style={{ width: 56, height: 56 }}
              contentFit="cover"
            />
          ) : (
            <VisitorSilhouette size={56} />
          )}
        </View>

        <View className="flex-1">
          <View className="mb-1 flex-row items-start justify-between gap-2">
            <Text
              className="flex-1 text-base text-ink"
              style={{ fontFamily: FontFamily.heading }}
              numberOfLines={1}
            >
              {visitor.name}
            </Text>
            {showStatus ? (
              <View
                className={`flex-row items-center gap-1 rounded-full border px-2 py-0.5 ${colors.bg} ${colors.border}`}
              >
                <StatusIcon status={visitor.status} color={colors.icon} />
                <Text className={`text-xs font-medium ${colors.text}`}>
                  {visitor.is_missed && visitor.status === 'pending' ? 'Missed' : statusLabel(visitor.status)}
                </Text>
              </View>
            ) : null}
          </View>

          <Text className="text-sm text-ink-soft">
            {typeLabel(visitor.type)} · {flatLabel(visitor)}
          </Text>
          {visitor.purpose ? (
            <Text className="mt-0.5 text-sm text-ink-muted" numberOfLines={2}>
              {visitor.purpose}
            </Text>
          ) : null}
          {visitor.status === 'rejected' && visitor.reject_reason ? (
            <View className="mt-1 rounded bg-status-rejectedSoft px-2 py-1">
              <Text className="text-xs font-medium text-status-rejected">
                Reason: {visitor.reject_reason}
              </Text>
            </View>
          ) : null}
          <Text className="mt-1 text-xs text-ink-faint">
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
              ? 'bg-status-rejected'
              : isPrimary
                ? 'bg-brand-700'
                : 'bg-surface-muted';
            const text = isDanger || isPrimary ? 'text-white' : 'text-ink';

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
                  <ActivityIndicator color={isDanger || isPrimary ? '#fff' : Brand.primary} />
                ) : (
                  <>
                    {action.icon === 'check' ? (
                      <Check color={isDanger || isPrimary ? '#fff' : Brand.primary} size={16} />
                    ) : null}
                    {action.icon === 'x' ? (
                      <X color={isDanger || isPrimary ? '#fff' : Brand.primary} size={16} />
                    ) : null}
                    {action.icon === 'qr-code' ? (
                      <QrCode color={isDanger || isPrimary ? '#fff' : Brand.primary} size={16} />
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
