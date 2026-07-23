import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { Brand, FontFamily } from '@/constants/theme';
import { getSelectedGateId, setSelectedGateId } from '@/lib/gate-preference';
import { fetchActiveGates } from '@/lib/gates-api';
import { getCurrentCoords, nearestGate } from '@/lib/location-helpers';
import { queryKeys } from '@/lib/query-client';

type Props = {
  societyId: string;
  value: string | null;
  onChange: (gateId: string) => void;
};

/** Compact gate selector for guard entry/exit flows. */
export function GatePicker({ societyId, value, onChange }: Props) {
  const [ready, setReady] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const gatesQuery = useQuery({
    queryKey: queryKeys.gates(societyId),
    queryFn: () => fetchActiveGates(societyId),
    enabled: Boolean(societyId),
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await getSelectedGateId(societyId);
      const gates = gatesQuery.data ?? [];
      if (cancelled) return;
      if (saved && gates.some((g) => g.id === saved)) {
        onChange(saved);
      } else if (!value && gates[0]) {
        onChange(gates[0].id);
        await setSelectedGateId(societyId, gates[0].id);
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once gates load
  }, [societyId, gatesQuery.data]);

  const suggestNearest = async () => {
    const gates = gatesQuery.data ?? [];
    if (gates.length < 2) return;
    setSuggesting(true);
    try {
      const here = await getCurrentCoords();
      if (!here) {
        Toast.show({
          type: 'error',
          text1: 'Location needed',
          text2: 'Allow location to suggest the nearest gate.',
        });
        return;
      }
      const match = nearestGate(gates, here);
      if (!match) {
        Toast.show({
          type: 'info',
          text1: 'No gate coordinates yet',
          text2: 'Ask an admin to pin each gate from the Gates screen.',
        });
        return;
      }
      onChange(match.gate.id);
      await setSelectedGateId(societyId, match.gate.id);
      Toast.show({
        type: 'success',
        text1: `Suggested: ${match.gate.name}`,
        text2:
          match.meters < 1000
            ? `About ${Math.round(match.meters)} m away`
            : `About ${(match.meters / 1000).toFixed(1)} km away`,
      });
    } finally {
      setSuggesting(false);
    }
  };

  const gates = gatesQuery.data ?? [];
  if (!ready || gates.length <= 1) return null;

  return (
    <View className="mb-3">
      <View className="mb-2 flex-row items-center justify-between">
        <Text
          className="text-xs font-semibold uppercase tracking-wider text-ink-muted"
          style={{ fontFamily: FontFamily.heading }}
        >
          Gate
        </Text>
        <Pressable
          onPress={() => void suggestNearest()}
          disabled={suggesting}
          className="flex-row items-center gap-1 rounded-pill px-2.5 py-1"
          style={{ backgroundColor: '#E8F5F1' }}
        >
          {suggesting ? (
            <ActivityIndicator size="small" color={Brand.primary} />
          ) : (
            <MapPin color={Brand.primary} size={12} />
          )}
          <Text
            className="text-[11px] font-semibold"
            style={{ color: Brand.primary, fontFamily: FontFamily.heading }}
          >
            Nearest
          </Text>
        </Pressable>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {gates.map((gate) => {
          const selected = value === gate.id;
          return (
            <Pressable
              key={gate.id}
              onPress={() => {
                onChange(gate.id);
                void setSelectedGateId(societyId, gate.id);
              }}
              className="rounded-pill px-3 py-2"
              style={{
                backgroundColor: selected ? Brand.primary : '#E8EEE9',
              }}
            >
              <Text
                className="text-xs font-semibold"
                style={{
                  color: selected ? '#fff' : Brand.ink,
                  fontFamily: FontFamily.heading,
                }}
              >
                {gate.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
