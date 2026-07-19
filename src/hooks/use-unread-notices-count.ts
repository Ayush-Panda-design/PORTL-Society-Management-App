import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchNotices } from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import { useReadStateStore } from '@/stores/readStateStore';

/** Count of society notices this device has not opened yet. */
export function useUnreadNoticesCount(): number {
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const seenNotices = useReadStateStore((s) => s.seenNotices);

  const { data } = useQuery({
    queryKey: queryKeys.notices(societyId ?? 'none'),
    queryFn: () => fetchNotices(societyId!),
    enabled: Boolean(societyId),
    // Keeps the badge fresh even before Realtime publication is enabled.
    refetchInterval: 8_000,
    refetchIntervalInBackground: false,
  });

  return useMemo(() => {
    if (!data?.length) return 0;
    let count = 0;
    for (const notice of data) {
      if (!seenNotices[notice.id]) count += 1;
    }
    return count;
  }, [data, seenNotices]);
}

/** Value for React Navigation `tabBarBadge` (undefined when zero). */
export function formatTabBadge(count: number): number | string | undefined {
  if (count <= 0) return undefined;
  if (count > 99) return '99+';
  return count;
}
