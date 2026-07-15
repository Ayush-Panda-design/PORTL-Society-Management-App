import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { VisitorCard } from '@/components/visitors/visitor-card';
import { ChipSelector } from '@/components/ui/chip-selector';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useVisitorsRealtime } from '@/hooks/use-visitors-realtime';
import { formatDateTime } from '@/lib/visitors';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { VisitorStatus, VisitorWithFlat } from '@/types/database';
import { VISITOR_STATUSES } from '@/types/database';

type DateFilter = 'today' | 'week' | 'all';

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfWeekIso() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

export default function GuardLogsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const [statusFilter, setStatusFilter] = useState<VisitorStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [logMeta, setLogMeta] = useState<Record<string, { logId: string; entry: string | null; exit: string | null }>>(
    {},
  );

  const statuses = useMemo(
    () => (statusFilter === 'all' ? undefined : [statusFilter]),
    [statusFilter],
  );

  const { visitors, isLoading, error, refresh } = useVisitorsRealtime({
    societyId: profile?.society_id,
    statuses,
    enabled: Boolean(profile?.society_id),
  });

  const filtered = useMemo(() => {
    return visitors.filter((v) => {
      if (dateFilter === 'all') return true;
      const created = new Date(v.created_at).getTime();
      if (dateFilter === 'today') return created >= new Date(startOfTodayIso()).getTime();
      return created >= new Date(startOfWeekIso()).getTime();
    });
  }, [visitors, dateFilter]);

  const loadLogs = useCallback(async (list: VisitorWithFlat[]) => {
    const ids = list.map((v) => v.id);
    if (ids.length === 0) {
      setLogMeta({});
      return;
    }

    const { data } = await supabase
      .from('visitor_logs')
      .select('id, visitor_id, entry_time, exit_time')
      .in('visitor_id', ids)
      .order('entry_time', { ascending: false });

    const map: Record<string, { logId: string; entry: string | null; exit: string | null }> = {};
    for (const row of data ?? []) {
      if (!map[row.visitor_id]) {
        map[row.visitor_id] = {
          logId: row.id,
          entry: row.entry_time,
          exit: row.exit_time,
        };
      }
    }
    setLogMeta(map);
  }, []);

  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;

  useEffect(() => {
    void loadLogs(filtered);
  }, [filtered, loadLogs]);

  useEffect(() => {
    if (!profile?.society_id) return;

    const channel = supabase
      .channel(`visitor-logs:${profile.society_id}:${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visitor_logs' },
        () => {
          void loadLogs(filteredRef.current);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profile?.society_id, loadLogs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    await loadLogs(filtered);
    setRefreshing(false);
  }, [refresh, loadLogs, filtered]);

  const markExit = async (visitor: VisitorWithFlat) => {
    const meta = logMeta[visitor.id];
    setActionId(visitor.id);
    setActionError(null);

    try {
      if (meta?.logId) {
        const { error: updateLogError } = await supabase
          .from('visitor_logs')
          .update({ exit_time: new Date().toISOString() })
          .eq('id', meta.logId);

        if (updateLogError) {
          setActionError(updateLogError.message);
          return;
        }
      } else {
        const { error: insertLogError } = await supabase.from('visitor_logs').insert({
          visitor_id: visitor.id,
          entry_time: null,
          exit_time: new Date().toISOString(),
          guard_id: profile?.id ?? null,
        });
        if (insertLogError) {
          setActionError(insertLogError.message);
          return;
        }
      }

      const { error: statusError } = await supabase
        .from('visitors')
        .update({ status: 'checked_out' })
        .eq('id', visitor.id);

      if (statusError) {
        setActionError(statusError.message);
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to mark exit');
    } finally {
      setActionId(null);
    }
  };

  if (!profile?.society_id) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <EmptyState visual="disconnected" title="No society linked" subtitle="Assign a society to view visitor logs." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="px-4 pb-2 pt-3">
        <Text className="text-2xl font-bold text-slate-900">Visitor logs</Text>
        <Text className="mb-3 text-sm text-slate-500">Society history · filters live</Text>

        <View className="mb-3">
          <SegmentedControl
            options={[
              { value: 'today', label: 'Today' },
              { value: 'week', label: '7 days' },
              { value: 'all', label: 'All' },
            ]}
            value={dateFilter}
            onChange={setDateFilter}
          />
        </View>

        <ChipSelector
          className="mb-1"
          options={[
            { value: 'all', label: 'All statuses' },
            ...VISITOR_STATUSES.map((s) => ({ value: s.value, label: s.label })),
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </View>

      {(error || actionError) && (
        <ErrorBanner message={actionError ?? error ?? ''} onRetry={refresh} />
      )}

      {isLoading && filtered.length === 0 ? (
        <SkeletonList count={4} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0F766E" />
          }
          ListEmptyComponent={
            <EmptyState
              visual="gate"
              title="No visitor history"
              subtitle="Registered visitors will show here with entry and exit times."
            />
          }
          renderItem={({ item }) => {
            const meta = logMeta[item.id];
            const canExit = item.status === 'checked_in';

            return (
              <View>
                <VisitorCard
                  visitor={item}
                  actions={
                    canExit
                      ? [
                          {
                            label: 'Mark Exit',
                            variant: 'secondary',
                            loading: actionId === item.id,
                            onPress: () => markExit(item),
                          },
                        ]
                      : undefined
                  }
                />
                {(meta?.entry || meta?.exit) && (
                  <View className="-mt-1 mb-1 rounded-b-2xl border border-t-0 border-slate-200 bg-slate-50 px-4 py-2">
                    <Text className="text-xs text-slate-500">
                      In {formatDateTime(meta.entry)} · Out {formatDateTime(meta.exit)}
                    </Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
