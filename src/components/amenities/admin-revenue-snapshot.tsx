import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { FontFamily, Pastels } from '@/constants/theme';
import { formatPaise } from '@/lib/ops-api';
import type { AdminAmenityRevenueRow } from '@/types/database';

type Props = {
  rows: AdminAmenityRevenueRow[];
  actionNeededCount: number;
  onFilterActionNeeded: () => void;
  filterActive: boolean;
};

export function AdminAmenityRevenueSnapshot({
  rows,
  actionNeededCount,
  onFilterActionNeeded,
  filterActive,
}: Props) {
  const collected = rows.reduce((s, r) => s + (r.collected_paise ?? 0), 0);
  const pending = rows.reduce((s, r) => s + (r.pending_paise ?? 0), 0);
  const topByRevenue = [...rows].sort(
    (a, b) => (b.collected_paise ?? 0) - (a.collected_paise ?? 0),
  )[0];
  const topByBookings = [...rows].sort(
    (a, b) => (b.booking_count ?? 0) - (a.booking_count ?? 0),
  )[0];

  return (
    <Card style={{ marginBottom: 12 }}>
      <Text
        className="text-xs font-bold uppercase tracking-widest text-ink-muted"
        style={{ fontFamily: FontFamily.heading }}
      >
        This month · amenity revenue
      </Text>
      <View className="mt-3 flex-row gap-4">
        <View className="flex-1">
          <Text className="text-xs text-ink-muted">Collected</Text>
          <Text className="text-lg text-ink" style={{ fontFamily: FontFamily.heading }}>
            {formatPaise(collected)}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs text-ink-muted">Pending</Text>
          <Text className="text-lg text-ink" style={{ fontFamily: FontFamily.heading }}>
            {formatPaise(pending)}
          </Text>
        </View>
      </View>
      {topByRevenue || topByBookings ? (
        <Text className="mt-2 text-xs text-ink-soft">
          {topByRevenue?.amenity_name
            ? `Top earner: ${topByRevenue.amenity_name} (${formatPaise(topByRevenue.collected_paise)})`
            : null}
          {topByBookings?.amenity_name
            ? ` · Most booked: ${topByBookings.amenity_name} (${topByBookings.booking_count})`
            : null}
        </Text>
      ) : null}
      {actionNeededCount > 0 ? (
        <Pressable
          onPress={onFilterActionNeeded}
          className="mt-3 self-start rounded-pill px-3 py-1.5"
          style={{
            backgroundColor: filterActive ? Pastels.peach : Pastels.butter,
          }}
        >
          <Text className="text-[12px] font-semibold text-ink">
            {filterActive ? 'Showing' : 'View'} {actionNeededCount} pending/failed payment
            {actionNeededCount === 1 ? '' : 's'}
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}
