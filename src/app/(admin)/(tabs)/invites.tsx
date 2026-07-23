import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, RefreshCw, Share2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { AnimatedPressable } from '@/components/ui/animated-pressable';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SuccessOverlay } from '@/components/ui/success-overlay';
import { ThemedRefreshControl } from '@/components/ui/themed-refresh-control';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, FontFamily } from '@/constants/theme';
import { useThemePalette } from '@/hooks/use-theme';
import { copyToClipboard } from '@/lib/clipboard';
import { hapticConfirm } from '@/lib/haptics';
import { queryKeys } from '@/lib/query-client';
import { listSocietyInviteCodes, regenerateInviteCode } from '@/lib/society-api';
import { useAuthStore } from '@/stores/authStore';
import type { InviteCode, InviteRole } from '@/types/database';

function roleLabel(role: InviteRole) {
  return role === 'resident' ? 'Resident' : 'Guard';
}

function InviteCodeCard({
  invite,
  busyRole,
  onRegenerate,
}: {
  invite: InviteCode;
  busyRole: InviteRole | null;
  onRegenerate: (role: InviteRole) => void;
}) {
  const { card, surface, border, inkMuted, primaryAccent, isDark } = useThemePalette();
  const shareMessage = `Join our society on Portl with this ${roleLabel(invite.role).toLowerCase()} invite code: ${invite.code}`;

  const share = async () => {
    try {
      await Share.share({ message: shareMessage });
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Could not share',
        text2: e instanceof Error ? e.message : undefined,
      });
    }
  };

  const isResident = invite.role === 'resident';
  const ticketTop = isResident ? Brand.charcoal : Brand.primaryDark;
  const expiresLabel = invite.expires_at
    ? new Date(invite.expires_at).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;
  const expired =
    invite.expires_at != null && new Date(invite.expires_at).getTime() < Date.now();

  return (
    <View className="mb-5 overflow-hidden rounded-bubbly">
      <View className="p-6" style={{ backgroundColor: ticketTop }}>
        <Text className="mb-1 text-xs font-medium uppercase tracking-wider text-white/75">
          {roleLabel(invite.role)} Access
        </Text>
        <Text
          className="mb-2 text-3xl tracking-[0.2em] text-white"
          style={{ fontFamily: FontFamily.display }}
        >
          {invite.code}
        </Text>
        <Text className="text-xs text-white/70">
          Share only with verified {isResident ? 'residents' : 'security staff'}
        </Text>
        {expiresLabel ? (
          <Text className={`mt-2 text-xs ${expired ? 'text-red-200' : 'text-white/70'}`}>
            {expired ? `Expired ${expiresLabel}` : `Expires ${expiresLabel}`}
          </Text>
        ) : null}
      </View>

      <View className="h-8 flex-row items-center overflow-hidden" style={{ backgroundColor: card }}>
        <View
          className="absolute left-0 -ml-2 h-8 w-4 rounded-r-full"
          style={{ backgroundColor: surface }}
        />
        <View
          className="mx-4 h-[1px] flex-1 border-b border-dashed"
          style={{ borderColor: border }}
        />
        <View
          className="absolute right-0 -mr-2 h-8 w-4 rounded-l-full"
          style={{ backgroundColor: surface }}
        />
      </View>

      <View
        className="flex-row items-center justify-end gap-2 px-4 pb-4 pt-1"
        style={{ backgroundColor: card }}
      >
        <AnimatedPressable
          onPress={() => void copyToClipboard(invite.code, 'Invite code copied')}
        >
          <View
            className="flex-row items-center rounded-soft px-4 py-2.5"
            style={{ backgroundColor: isDark ? '#334155' : '#E2E8F0' }}
          >
            <Copy color={isDark ? '#fff' : Brand.ink} size={16} className="mr-2" />
            <Text
              className="font-bold"
              style={{ color: isDark ? '#fff' : Brand.ink }}
            >
              Copy
            </Text>
          </View>
        </AnimatedPressable>
        <AnimatedPressable onPress={() => void share()}>
          <View
            className="flex-row items-center rounded-soft px-4 py-2.5"
            style={{ backgroundColor: isResident ? Brand.charcoal : Brand.primary }}
          >
            <Share2 color="#fff" size={16} className="mr-2" />
            <Text className="font-bold text-white">Share</Text>
          </View>
        </AnimatedPressable>
      </View>

      <Pressable
        disabled={busyRole === invite.role}
        onPress={() => onRegenerate(invite.role)}
        className={`mt-2 flex-row items-center justify-center gap-2 py-2 ${
          busyRole === invite.role ? 'opacity-60' : ''
        }`}
      >
        {busyRole === invite.role ? (
          <ActivityIndicator color={inkMuted} size="small" />
        ) : (
          <RefreshCw color={isDark ? primaryAccent : Brand.inkMuted} size={14} />
        )}
        <Text className="text-xs text-ink-soft">
          Regenerate code (invalidates old code · resets 90-day expiry)
        </Text>
      </Pressable>
    </View>
  );
}

export default function AdminInvitesScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);
  const queryClient = useQueryClient();
  const invitesKey = queryKeys.inviteCodes(societyId ?? 'none');
  const [refreshing, setRefreshing] = useState(false);

  const listQuery = useQuery({
    queryKey: invitesKey,
    queryFn: listSocietyInviteCodes,
    enabled: Boolean(societyId),
  });

  const [successRole, setSuccessRole] = useState<InviteRole | null>(null);

  const regenMutation = useMutation({
    mutationFn: (role: InviteRole) => regenerateInviteCode(role),
    onSuccess: async (_data, role) => {
      await queryClient.invalidateQueries({ queryKey: invitesKey });
      hapticConfirm();
      Toast.show({ type: 'success', text1: 'Invite code updated' });
      setSuccessRole(role);
    },
    onError: (e: Error) => {
      Toast.show({ type: 'error', text1: 'Could not regenerate', text2: e.message });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await listQuery.refetch();
    setRefreshing(false);
  }, [listQuery]);

  if (!societyId) {
    return (
      <ScreenHeader title="Invites" subtitle="Share codes to grow your society" showBack>
        <EmptyState
          visual="disconnected"
          title="No society linked"
          subtitle="Create or join a society first."
        />
      </ScreenHeader>
    );
  }

  const byRole = {
    resident: listQuery.data?.find((c) => c.role === 'resident'),
    guard: listQuery.data?.find((c) => c.role === 'guard'),
  };

  return (
    <ScreenHeader
      title="Invite links"
      subtitle="Separate codes for residents and guards"
      showBack
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        refreshControl={
          <ThemedRefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
        }
      >
        {listQuery.error ? (
          <ErrorBanner
            message={listQuery.error.message}
            onRetry={() => void listQuery.refetch()}
          />
        ) : null}

        {listQuery.isLoading ? (
          <SkeletonList count={2} />
        ) : (
          <>
            {byRole.resident ? (
              <InviteCodeCard
                invite={byRole.resident}
                busyRole={regenMutation.isPending ? regenMutation.variables ?? null : null}
                onRegenerate={(role) => regenMutation.mutate(role)}
              />
            ) : null}
            {byRole.guard ? (
              <InviteCodeCard
                invite={byRole.guard}
                busyRole={regenMutation.isPending ? regenMutation.variables ?? null : null}
                onRegenerate={(role) => regenMutation.mutate(role)}
              />
            ) : null}
            {!byRole.resident && !byRole.guard ? (
              <EmptyState
                visual="invites"
                title="No invite codes yet"
                subtitle="Codes are created when the society is set up."
              />
            ) : null}
          </>
        )}

        <Text className="mt-2 text-center text-xs text-ink-muted">
          Admin access is not joinable via code. Promote co-admins from the residents panel later.
        </Text>
      </ScrollView>

      <SuccessOverlay
        visible={successRole !== null}
        message={successRole ? `${roleLabel(successRole)} code regenerated` : undefined}
        onDone={() => setSuccessRole(null)}
      />
    </ScreenHeader>
  );
}
