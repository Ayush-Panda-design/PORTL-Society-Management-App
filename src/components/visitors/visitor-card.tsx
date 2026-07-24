import { Image } from 'expo-image';
import { Check, CheckCircle2, Clock3, LogIn, LogOut, X, XCircle, QrCode } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { VisitorSilhouette } from '@/components/illustrations';
import { Brand, FontFamily } from '@/constants/theme';
import { useThemePalette } from '@/hooks/use-theme';
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
  const { pastels, isDark } = useThemePalette();

  return (
    <View
      className="overflow-hidden rounded-card bg-surface-card p-4"
      style={{
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: isDark ? 0.16 : 0.08,
        shadowRadius: isDark ? 10 : 16,
        elevation: isDark ? 2 : 3,
        ...(isDark
          ? {
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: 'rgba(255,255,255,0.08)',
            }
          : null),
      }}
    >
      <View className="flex-row gap-3">
        <View
          className="h-14 w-14 overflow-hidden rounded-xl"
          style={{ backgroundColor: pastels.rose }}
        >
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
          {visitor.entry_time || visitor.exit_time ? (
            <Text className="mt-1 text-xs text-ink-muted">
              {visitor.entry_time
                ? `In ${new Date(visitor.entry_time).toLocaleString()}${
                    visitor.entry_gate_name ? ` · ${visitor.entry_gate_name}` : ''
                  }`
                : 'Not checked in'}
              {visitor.exit_time
                ? `\nOut ${new Date(visitor.exit_time).toLocaleString()}${
                    visitor.exit_gate_name ? ` · ${visitor.exit_gate_name}` : ''
                  }`
                : ''}
            </Text>
          ) : null}
          {visitor.status === 'pending' && (visitor.escalation_level ?? 0) > 0 ? (
            <Text className="mt-1 text-xs font-medium text-amber-700">
              {(visitor.escalation_level ?? 0) >= 2
                ? 'Escalated to admin / committee'
                : 'Escalated — other flat members notified'}
            </Text>
          ) : null}
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
                ? ''
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
                style={isPrimary && !isDanger ? { backgroundColor: Brand.primary } : undefined}
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
