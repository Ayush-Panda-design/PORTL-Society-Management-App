import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Brand, FontFamily } from '@/constants/theme';
import { getSelectedGateId, setSelectedGateId } from '@/lib/gate-preference';
import { fetchActiveGates } from '@/lib/gates-api';
import { queryKeys } from '@/lib/query-client';

type Props = {
  societyId: string;
  value: string | null;
  onChange: (gateId: string) => void;
};

/** Compact gate selector for guard entry/exit flows. */
export function GatePicker({ societyId, value, onChange }: Props) {
  const [ready, setReady] = useState(false);
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

  const gates = gatesQuery.data ?? [];
  if (!ready || gates.length <= 1) return null;

  return (
    <View className="mb-3">
      <Text
        className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted"
        style={{ fontFamily: FontFamily.heading }}
      >
        Gate
      </Text>
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
