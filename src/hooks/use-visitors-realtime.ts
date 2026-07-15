import { useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { VISITOR_SELECT } from '@/lib/visitors';
import type { VisitorStatus, VisitorWithFlat } from '@/types/database';

type UseVisitorsOptions = {
  societyId?: string | null;
  flatId?: string | null;
  statuses?: VisitorStatus[];
  enabled?: boolean;
  /** Max rows to fetch (default 40). */
  limit?: number;
  /** Only fetch/subscribe while screen is focused (default true). */
  onlyWhenFocused?: boolean;
};

type UseVisitorsResult = {
  visitors: VisitorWithFlat[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

function matchesFilters(
  visitor: VisitorWithFlat,
  options: {
    societyId?: string | null;
    flatId?: string | null;
    statuses?: VisitorStatus[];
  },
): boolean {
  if (options.societyId && visitor.society_id !== options.societyId) return false;
  if (options.flatId && visitor.flat_id !== options.flatId) return false;
  if (options.statuses && options.statuses.length > 0) {
    return options.statuses.includes(visitor.status);
  }
  return true;
}

export function useVisitorsRealtime(options: UseVisitorsOptions): UseVisitorsResult {
  const {
    societyId,
    flatId,
    statuses,
    enabled = true,
    limit = 40,
    onlyWhenFocused = true,
  } = options;

  const isFocused = useIsFocused();
  const active = enabled && (!onlyWhenFocused || isFocused);

  const statusesKey = statuses?.slice().sort().join(',') ?? '';
  const statusesStable = useMemo(
    () => (statusesKey ? (statusesKey.split(',') as VisitorStatus[]) : undefined),
    [statusesKey],
  );

  const [visitors, setVisitors] = useState<VisitorWithFlat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const statusesRef = useRef(statusesStable);
  statusesRef.current = statusesStable;
  const instanceId = useRef(`i${Math.random().toString(36).slice(2, 10)}`).current;
  const hasLoadedOnce = useRef(false);

  const fetchVisitors = useCallback(async () => {
    if (!active || (!societyId && !flatId)) {
      if (!active) {
        setIsLoading(false);
        return;
      }
      setVisitors([]);
      setIsLoading(false);
      return;
    }

    // Avoid full-screen skeleton flash on every focus refresh
    if (!hasLoadedOnce.current) {
      setIsLoading(true);
    }
    setError(null);

    try {
      let query = supabase
        .from('visitors')
        .select(VISITOR_SELECT)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (societyId) query = query.eq('society_id', societyId);
      if (flatId) query = query.eq('flat_id', flatId);
      if (statusesStable && statusesStable.length > 0) {
        query = query.in('status', statusesStable);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
        setVisitors([]);
        return;
      }

      setVisitors((data as VisitorWithFlat[]) ?? []);
      hasLoadedOnce.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load visitors');
      setVisitors([]);
    } finally {
      setIsLoading(false);
    }
  }, [active, societyId, flatId, statusesStable, limit]);

  useEffect(() => {
    void fetchVisitors();
  }, [fetchVisitors]);

  useEffect(() => {
    if (!active || (!societyId && !flatId)) return;

    const channelName = `visitors:${societyId ?? 'x'}:${flatId ?? 'x'}:${statusesKey || 'all'}:${instanceId}`;
    const filter = societyId
      ? `society_id=eq.${societyId}`
      : `flat_id=eq.${flatId}`;

    const channel = supabase.channel(channelName);

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'visitors',
        filter,
      },
      async (payload) => {
        const eventType = payload.eventType;

        if (eventType === 'DELETE') {
          const oldRow = payload.old as { id?: string };
          if (oldRow.id) {
            setVisitors((prev) => prev.filter((v) => v.id !== oldRow.id));
          }
          return;
        }

        const row = payload.new as { id: string };
        const { data, error: fetchError } = await supabase
          .from('visitors')
          .select(VISITOR_SELECT)
          .eq('id', row.id)
          .maybeSingle();

        if (fetchError || !data) {
          void fetchVisitors();
          return;
        }

        const visitor = data as VisitorWithFlat;
        const allowed = matchesFilters(visitor, {
          societyId,
          flatId,
          statuses: statusesRef.current,
        });

        setVisitors((prev) => {
          const without = prev.filter((v) => v.id !== visitor.id);
          if (!allowed) return without;
          const next = [visitor, ...without].slice(0, limit);
          next.sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );
          return next;
        });
      },
    );

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [active, societyId, flatId, statusesKey, fetchVisitors, instanceId, limit]);

  return {
    visitors,
    isLoading: isLoading && !hasLoadedOnce.current,
    error,
    refresh: fetchVisitors,
  };
}
