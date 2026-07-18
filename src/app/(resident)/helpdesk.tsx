import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView, KeyboardAvoidingView } from 'react-native-keyboard-controller';
import {
  Car,
  CheckCircle,
  Clock,
  Droplets,
  Leaf,
  ShieldAlert,
  Wrench,
  Zap,
} from 'lucide-react-native';

import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { SuccessOverlay } from '@/components/ui/success-overlay';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { complaintStatusTone } from '@/lib/community';
import { createComplaint, fetchComplaintsForFlat } from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';
import { COMPLAINT_CATEGORIES } from '@/types/database';
import { Brand, FontFamily, Pastels } from '@/constants/theme';

// Map complaint category → icon + color
const CATEGORY_ICONS: Record<string, { Icon: typeof Wrench; color: string; bg: string }> = {
  Parking: { Icon: Car, color: '#6B5CC4', bg: Pastels.lilac },
  Water: { Icon: Droplets, color: '#2563EB', bg: Pastels.sky },
  Electricity: { Icon: Zap, color: '#C4861A', bg: Pastels.butter },
  Cleanliness: { Icon: Leaf, color: Brand.primary, bg: Pastels.mint },
  Security: { Icon: ShieldAlert, color: '#C0392B', bg: Pastels.rose },
  Maintenance: { Icon: Wrench, color: '#B06020', bg: Pastels.peach },
};

function getCategory(cat: string) {
  return CATEGORY_ICONS[cat] ?? { Icon: Wrench, color: Brand.inkMuted, bg: Pastels.sage };
}

/** Icon-based category selector chips — replaces dropdown. */
function CategoryChipGrid({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View className="mb-4 flex-row flex-wrap gap-2">
      {COMPLAINT_CATEGORIES.map((cat) => {
        const { Icon, color, bg } = getCategory(cat);
        const selected = value === cat;
        return (
          <Pressable
            key={cat}
            onPress={() => onChange(cat)}
            className="flex-row items-center gap-1.5 rounded-pill px-3 py-2"
            style={{
              backgroundColor: selected ? color : bg,
              borderWidth: selected ? 0 : 1,
              borderColor: 'transparent',
            }}
          >
            <Icon color={selected ? '#fff' : color} size={14} strokeWidth={1.5} />
            <Text
              className="text-xs font-semibold"
              style={{ color: selected ? '#fff' : color, fontFamily: FontFamily.heading }}
            >
              {cat}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Status pill badge — icon + color + text. */
function StatusBadge({ status }: { status: string }) {
  const tone = complaintStatusTone(status);
  const isResolved = status === 'resolved';
  const isPending = status === 'open' || status === 'pending';
  const BadgeIcon = isResolved ? CheckCircle : isPending ? Clock : Wrench;

  return (
    <View
      className="flex-row items-center gap-1 rounded-pill px-2.5 py-1"
      style={{ backgroundColor: tone.bgRaw ?? Pastels.mint }}
    >
      <BadgeIcon color={tone.colorRaw ?? Brand.primary} size={12} strokeWidth={1.5} />
      <Text
        className="text-[11px] font-semibold"
        style={{ color: tone.colorRaw ?? Brand.primary, fontFamily: FontFamily.heading }}
      >
        {tone.label}
      </Text>
    </View>
  );
}

export default function ResidentHelpdeskScreen() {
  const profile = useAuthStore((s) => s.profile);
  const flatId = profile?.flat_id;
  const queryClient = useQueryClient();

  const [category, setCategory] = useState<string>(COMPLAINT_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);

  const listQuery = useQuery({
    queryKey: queryKeys.complaints(`flat:${flatId ?? 'none'}`),
    queryFn: () => fetchComplaintsForFlat(flatId!),
    enabled: Boolean(flatId),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!flatId) throw new Error('No flat linked to your profile.');
      if (!description.trim()) throw new Error('Please describe the issue.');
      await createComplaint({
        flatId,
        category,
        description: description.trim(),
      });
    },
    onSuccess: async () => {
      setDescription('');
      setSuccessVisible(true);
      setFormError(null);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.complaints(`flat:${flatId}`),
      });
    },
    onError: (e: Error) => {
      setSuccessVisible(false);
      setFormError(e.message);
    },
  });

  if (!flatId) {
    return (
      <ScreenHeader title="Helpdesk" showBack>
        <EmptyState
          visual="disconnected"
          title="No flat linked"
          subtitle="Ask an admin to link your flat before filing complaints."
        />
      </ScreenHeader>
    );
  }

  return (
    <ScreenHeader title="Helpdesk" subtitle="Report issues for your flat" showBack>
      <KeyboardAvoidingView behavior="padding" className="flex-1" keyboardVerticalOffset={8}>
        <FlatList
          data={listQuery.data ?? []}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderScrollComponent={(props) => (
            <KeyboardAwareScrollView {...props} bottomOffset={24} />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          refreshControl={
            <ThemedRefreshControl
              refreshing={listQuery.isRefetching}
              onRefresh={() => void listQuery.refetch()}
            />
          }
          ListHeaderComponent={
            <View
              className="mb-4 rounded-panel bg-surface-card p-4"
              style={{
                shadowColor: Brand.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <Text className="mb-3 text-lg text-ink" style={{ fontFamily: FontFamily.display }}>
                Raise a complaint
              </Text>

              {formError ? (
                <View className="mb-3 rounded-card bg-status-rejectedSoft px-3 py-2">
                  <Text className="text-sm text-status-rejected">{formError}</Text>
                </View>
              ) : null}

              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted" style={{ fontFamily: FontFamily.heading }}>
                Category
              </Text>
              <CategoryChipGrid value={category} onChange={setCategory} />

              <TextInput
                className="mb-4 min-h-[90px] rounded-card bg-surface-muted px-4 py-3 text-base text-ink"
                placeholder="Describe the issue in detail…"
                placeholderTextColor={Brand.inkMuted}
                multiline
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
              />

              <Pressable
                onPress={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className={`items-center rounded-card py-3.5 ${createMutation.isPending ? 'opacity-60' : ''}`}
                style={{ backgroundColor: Brand.accent }}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="font-semibold text-white" style={{ fontFamily: FontFamily.heading }}>
                    Submit complaint
                  </Text>
                )}
              </Pressable>

              <Text className="mb-1 mt-6 text-base text-ink" style={{ fontFamily: FontFamily.display }}>
                Your complaints
              </Text>
            </View>
          }
          ListEmptyComponent={
            listQuery.isLoading ? (
              <SkeletonList count={2} />
            ) : listQuery.error ? (
              <ErrorBanner
                message={listQuery.error.message}
                onRetry={() => void listQuery.refetch()}
              />
            ) : (
              <EmptyState visual="helpdesk" title="No complaints yet" subtitle="Submitted tickets will show here." />
            )
          }
          renderItem={({ item }) => {
            const { Icon: CatIcon, color: catColor, bg: catBg } = getCategory(item.category);
            const ageMs = Date.now() - new Date(item.created_at).getTime();
            const ageDays = Math.floor(ageMs / 86400000);
            const ageText = ageDays === 0 ? 'Today' : ageDays === 1 ? 'Yesterday' : `${ageDays}d ago`;

            return (
              <View
                className="rounded-panel bg-surface-card"
                style={{
                  shadowColor: '#101512',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <View className="flex-row items-start gap-3 p-4">
                  {/* Category icon pill */}
                  <View
                    className="h-10 w-10 items-center justify-center rounded-panel"
                    style={{ backgroundColor: catBg }}
                  >
                    <CatIcon color={catColor} size={18} strokeWidth={1.5} />
                  </View>
                  <View className="flex-1">
                    <View className="mb-1.5 flex-row items-center justify-between">
                      <Text className="text-base font-semibold text-ink" style={{ fontFamily: FontFamily.heading }}>
                        {item.category}
                      </Text>
                      <StatusBadge status={item.status} />
                    </View>
                    <Text className="mb-2 text-sm leading-5 text-ink-soft" numberOfLines={2}>
                      {item.description}
                    </Text>
                    {/* Progress age line */}
                    <Text className="text-xs text-ink-faint">{ageText}</Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      </KeyboardAvoidingView>
      <SuccessOverlay
        visible={successVisible}
        message="Complaint submitted"
        onDone={() => setSuccessVisible(false)}
      />
    </ScreenHeader>
  );
}
