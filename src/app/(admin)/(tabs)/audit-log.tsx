import { useQuery } from '@tanstack/react-query';
import { Shield } from 'lucide-react-native';
import { FlatList, Text, View } from 'react-native';

import { AppCard } from '@/components/ui/brand';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
import { fetchAuditLogs } from '@/lib/ops-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import type { AuditLog } from '@/types/database';

function AuditRow({ item }: { item: AuditLog }) {
  return (
    <AppCard className="p-4">
      <Text className="text-[15px] text-ink" style={{ fontFamily: FontFamily.heading }}>
        {item.action}
      </Text>
      <Text className="mt-0.5 text-xs text-ink-muted">
        {item.entity_type}
        {item.entity_id ? ` · ${item.entity_id.slice(0, 8)}…` : ''}
      </Text>
      <Text className="mt-1 text-xs text-ink-soft">
        {new Date(item.created_at).toLocaleString()}
      </Text>
    </AppCard>
  );
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
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          refreshControl={
            <ThemedRefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
          }
          ListEmptyComponent={
            <EmptyState
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
          renderItem={({ item }) => <AuditRow item={item} />}
        />
      )}
    </ScreenHeader>
  );
}
