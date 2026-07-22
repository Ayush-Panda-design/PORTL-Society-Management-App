import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Shield } from 'lucide-react-native';
import { FlatList, View } from 'react-native';

import { ListRow } from '@/components/ui/list-row';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StaggeredListItem } from '@/components/ui/staggered-list-item';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, Pastels } from '@/constants/theme';
import { fetchAuditLogs } from '@/lib/ops-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';

const SEVERE_ACTION_HINTS = ['delete', 'remove', 'reject', 'ban', 'revoke', 'refund'];
const WARN_ACTION_HINTS = ['reopen', 'expire', 'fail', 'suspend'];

type Severity = 'destructive' | 'warn' | 'normal';

function auditSeverity(action: string): Severity {
  const a = action.toLowerCase();
  if (SEVERE_ACTION_HINTS.some((hint) => a.includes(hint))) return 'destructive';
  if (WARN_ACTION_HINTS.some((hint) => a.includes(hint))) return 'warn';
  return 'normal';
}

const SEVERITY_META: Record<Severity, { accent: string; bg: string }> = {
  destructive: { accent: '#E11D48', bg: Pastels.rose },
  warn: { accent: Brand.accent, bg: Pastels.peach },
  normal: { accent: Brand.primaryMid, bg: Pastels.mint },
};

function actionLabel(action: string): string {
  return action
    .split(/[._]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function AuditLogScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.auditLogs(societyId ?? 'none'),
    queryFn: () => fetchAuditLogs(80),
    enabled: Boolean(societyId),
  });

  return (
    <ScreenHeader title="Audit log" subtitle="Admin accountability trail" showBack>
      {error ? (
        <ErrorBanner message={error.message} onRetry={() => void refetch()} />
      ) : null}

      {isLoading && !data ? (
        <SkeletonList count={6} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
          refreshControl={
            <ThemedRefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
          }
          initialNumToRender={15}
          windowSize={8}
          removeClippedSubviews
          ListEmptyComponent={
            <EmptyState
              visual="default"
              title="No audit entries yet"
              subtitle="Approvals, complaint updates, flat edits, and notice changes will appear here."
              tips={[
                {
                  Icon: Shield,
                  title: 'Who / when',
                  body: 'Every sensitive admin action is logged with actor and timestamp.',
                  tint: Brand.primary,
                  wash: Pastels.sage,
                },
              ]}
            />
          }
          renderItem={({ item, index }) => {
            const severity = auditSeverity(item.action);
            const meta = SEVERITY_META[severity];
            const SeverityIcon = severity === 'normal' ? Shield : AlertTriangle;
            return (
              <StaggeredListItem index={index} disabled={isRefetching}>
                <ListRow
                  title={actionLabel(item.action)}
                  subtitle={`${item.entity_type}${item.entity_id ? ` · ${item.entity_id.slice(0, 8)}…` : ''}`}
                  meta={new Date(item.created_at).toLocaleString()}
                  accentColor={meta.accent}
                  last={index === (data?.length ?? 0) - 1}
                  leading={
                    <View
                      className="h-10 w-10 items-center justify-center rounded-full"
                      style={{ backgroundColor: meta.bg }}
                    >
                      <SeverityIcon color={meta.accent} size={16} strokeWidth={1.5} />
                    </View>
                  }
                />
              </StaggeredListItem>
            );
          }}
        />
      )}
    </ScreenHeader>
  );
}
