import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Share, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Flag, Download, X } from 'lucide-react-native';

import { StaggeredListItem } from '@/components/ui/staggered-list-item';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { VisitorCard } from '@/components/visitors/visitor-card';
import { ChipSelector } from '@/components/ui/chip-selector';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
import { useModalBack } from '@/hooks/use-modal-back';
import { useVisitorsRealtime } from '@/hooks/use-visitors-realtime';
import { formatDateTime, flatTowerName } from '@/lib/visitors';
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
  const [notesModal, setNotesModal] = useState<{ visitorId: string; logId: string | null } | null>(null);
  useModalBack(notesModal !== null, () => setNotesModal(null));
  const [notesText, setNotesText] = useState('');
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [logMeta, setLogMeta] = useState<Record<string, { logId: string; entry: string | null; exit: string | null; notes: string | null; isFlagged: boolean }>>({});

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
      .select('id, visitor_id, entry_time, exit_time, notes, is_flagged')
      .in('visitor_id', ids)
      .order('entry_time', { ascending: false });

    const map: Record<string, { logId: string; entry: string | null; exit: string | null; notes: string | null; isFlagged: boolean }> = {};
    for (const row of data ?? []) {
      if (!map[row.visitor_id]) {
        map[row.visitor_id] = {
          logId: row.id,
          entry: row.entry_time,
          exit: row.exit_time,
          notes: row.notes ?? null,
          isFlagged: row.is_flagged ?? false,
        };
      }
    }
    setLogMeta(map);
    // Sync flagged set
    const newFlagged = new Set<string>();
    for (const [visitorId, meta] of Object.entries(map)) {
      if (meta.isFlagged) newFlagged.add(visitorId);
    }
    setFlagged(newFlagged);
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

  const toggleFlag = async (visitor: VisitorWithFlat) => {
    const meta = logMeta[visitor.id];
    if (!meta?.logId) return;
    const newVal = !meta.isFlagged;
    const { error } = await supabase
      .from('visitor_logs')
      .update({ is_flagged: newVal })
      .eq('id', meta.logId);
    if (!error) {
      setLogMeta(prev => ({
        ...prev,
        [visitor.id]: { ...prev[visitor.id]!, isFlagged: newVal },
      }));
      setFlagged(prev => {
        const next = new Set(prev);
        if (newVal) next.add(visitor.id); else next.delete(visitor.id);
        return next;
      });
    }
  };

  const openNotes = (visitor: VisitorWithFlat) => {
    const meta = logMeta[visitor.id];
    setNotesModal({ visitorId: visitor.id, logId: meta?.logId ?? null });
    setNotesText(meta?.notes ?? '');
  };

  const saveNotes = async () => {
    if (!notesModal) return;
    const { logId, visitorId } = notesModal;
    if (logId) {
      await supabase.from('visitor_logs').update({ notes: notesText.trim() || null }).eq('id', logId);
    }
    setLogMeta(prev => ({
      ...prev,
      [visitorId]: { ...prev[visitorId]!, notes: notesText.trim() || null },
    }));
    setNotesModal(null);
  };

  const exportCsv = async () => {
    const rows = filtered.map(v => {
      const meta = logMeta[v.id];
      const flat = v.flats ? `Flat ${v.flats.number}${flatTowerName(v.flats.towers) ? ` (${flatTowerName(v.flats.towers)})` : ''}` : 'Unknown';
      return [
        `"${v.name}"`,
        `"${v.phone ?? ''}"`,
        `"${v.type}"`,
        `"${v.status}"`,
        `"${flat}"`,
        `"${formatDateTime(meta?.entry ?? null)}"`,
        `"${formatDateTime(meta?.exit ?? null)}"`,
        `"${meta?.isFlagged ? 'YES' : 'no'}"`,
        `"${(meta?.notes ?? '').replace(/"/g, '""')}"`,
      ].join(',');
    });
    const header = 'Name,Phone,Type,Status,Flat,Entry,Exit,Flagged,Notes';
    const csv = [header, ...rows].join('\n');
    await Share.share({ message: csv, title: 'Visitor Logs Export' });
  };

  if (!profile?.society_id) {
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <EmptyState visual="disconnected" title="No society linked" subtitle="Assign a society to view visitor logs." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-4 pb-2 pt-3">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl text-ink" style={{ fontFamily: FontFamily.display }}>
              Visitor logs
            </Text>
            <Text className="mb-2 mt-0.5 text-sm text-ink-muted">Society history · filters live</Text>
          </View>
          <Pressable
            onPress={() => void exportCsv()}
            className="flex-row items-center gap-1.5 rounded-xl bg-brand-50 border border-brand-200 px-3 py-2"
          >
            <Download size={14} color={Brand.primary} />
            <Text className="text-xs font-semibold" style={{ color: Brand.primary }}>Export</Text>
          </Pressable>
        </View>

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
          presentation="filter"
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
          initialNumToRender={10}
          windowSize={8}
          maxToRenderPerBatch={10}
          removeClippedSubviews
          refreshControl={
            <ThemedRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <EmptyState
              visual="visitors"
              title="No visitor history"
              subtitle="Registered visitors will show here with entry and exit times."
            />
          }
          renderItem={({ item, index }) => {
            const meta = logMeta[item.id];
            const canExit = item.status === 'checked_in';
            const isFlagged = flagged.has(item.id);

            return (
              <StaggeredListItem index={index} disabled={refreshing}>
                <VisitorCard
                  visitor={item}
                  actions={[
                    ...(canExit ? [{
                      label: 'Mark Exit',
                      variant: 'secondary' as const,
                      loading: actionId === item.id,
                      onPress: () => markExit(item),
                    }] : []),
                    {
                      label: isFlagged ? '🚩 Flagged' : 'Flag',
                      variant: isFlagged ? 'danger' as const : 'secondary' as const,
                      onPress: () => void toggleFlag(item),
                    },
                    {
                      label: 'Notes',
                      variant: 'secondary' as const,
                      onPress: () => openNotes(item),
                    },
                  ]}
                />
                {(meta?.entry || meta?.exit) && (
                  <View className="-mt-1 mb-1 rounded-b-card bg-surface-muted px-4 py-2" style={{ borderWidth: 1, borderColor: '#E5E8E4', borderTopWidth: 0 }}>
                    <Text className="text-xs text-ink-muted" style={{ fontFamily: FontFamily.heading }}>
                      In {formatDateTime(meta.entry)} {meta?.exit ? `· Out ${formatDateTime(meta.exit)}` : ''}
                      {meta?.notes ? ` · 📝 ${meta.notes}` : ''}
                    </Text>
                  </View>
                )}
              </StaggeredListItem>
            );
          }}
        />
      )}

      {/* Notes Modal */}
      <Modal
        visible={notesModal !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setNotesModal(null)}
      >
        <View className="flex-1 justify-center bg-black/50 px-6">
          <View className="rounded-2xl bg-surface-card p-5">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg text-ink" style={{ fontFamily: FontFamily.display }}>Guard Notes</Text>
              <Pressable onPress={() => setNotesModal(null)}>
                <X size={20} color={Brand.inkMuted} />
              </Pressable>
            </View>
            <TextInput
              className="min-h-[80px] rounded-xl border border-surface-border bg-surface-muted px-4 py-3 text-base text-ink mb-4"
              placeholder="Record anything unusual about this visit…"
              multiline
              textAlignVertical="top"
              value={notesText}
              onChangeText={setNotesText}
            />
            <Pressable
              className="items-center rounded-xl py-3"
              style={{ backgroundColor: Brand.primary }}
              onPress={() => void saveNotes()}
            >
              <Text className="font-semibold text-white">Save Notes</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}