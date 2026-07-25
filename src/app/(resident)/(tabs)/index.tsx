import { useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import {
  AlertTriangle,
  Bell,
  Building2,
  ChevronRight,
  ClipboardList,
  DoorOpen,
  MessageSquare,
  Phone,
  Receipt,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Vote,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import Toast from 'react-native-toast-message';

import { AskPortlFloatingFab, AskPortlOrb } from '@/components/ask-portl/ask-portl-orb';
import { GateAuthIllustration } from '@/components/illustrations';
import { DrawerMenuButton } from '@/components/navigation/drawer-menu-button';
import { SoftPromoCard, InitialsAvatar } from '@/components/ui/brand';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { VisitorSwipeDeck } from '@/components/visitors/visitor-swipe-deck';
import type { SwipeDecision } from '@/components/visitors/swipeable-visitor-card';
import { AnimatedPressable } from '@/components/ui/animated-pressable';
import { Brand, FontFamily, SocietyImages, getPastels, type PastelTone } from '@/constants/theme';
import { useThemePalette } from '@/hooks/use-theme';
import { useFeatureBadges } from '@/hooks/use-feature-badges';
import { useVisitorsRealtime } from '@/hooks/use-visitors-realtime';
import { isPollExpired, isPollPublished } from '@/lib/community';
import {
  fetchAmenities,
  fetchPolls,
  fetchStaff,
} from '@/lib/community-api';
import { queryKeys } from '@/lib/query-client';
import { href } from '@/lib/href';
import { formatRelativeTime, updateVisitorStatus } from '@/lib/visitors';
import { useAuthStore } from '@/stores/authStore';
import type { VisitorStatus, VisitorWithFlat } from '@/types/database';

function QuickAction({
  label,
  icon,
  bg,
  onPress,
  badge,
}: {
  label: string;
  icon: ReactNode;
  bg: string;
  onPress: () => void;
  badge?: number;
}) {
  return (
    <AnimatedPressable onPress={onPress} accessibilityLabel={label}>
      <View className="mr-3 w-[72px] items-center">
        <View
          className="h-[56px] w-[56px] items-center justify-center rounded-[18px]"
          style={{
            backgroundColor: bg,
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
            elevation: 1,
          }}
        >
          {icon}
          {badge !== undefined && badge > 0 ? (
            <View
              className="absolute -right-0.5 -top-0.5 min-w-[18px] items-center justify-center rounded-full px-1"
              style={{ backgroundColor: Brand.primary, height: 18 }}
            >
              <Text className="text-[10px] font-bold text-white">{badge > 9 ? '9+' : badge}</Text>
            </View>
          ) : null}
        </View>
        <Text
          className="mt-1.5 text-center text-[11px] text-ink"
          style={{ fontFamily: FontFamily.heading }}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

function activityLabel(status: VisitorStatus): string {
  switch (status) {
    case 'pending':
      return 'needs approval';
    case 'approved':
      return 'approved';
    case 'checked_in':
      return 'entered';
    case 'checked_out':
      return 'left';
    case 'rejected':
      return 'declined';
    default:
      return status;
  }
}

function activityTone(status: VisitorStatus): string {
  switch (status) {
    case 'pending':
      return Brand.accent;
    case 'approved':
    case 'checked_in':
      return Brand.primary;
    case 'rejected':
      return Brand.primary;
    default:
      return Brand.inkMuted;
  }
}

function GateActivityRow({
  visitor,
  onPress,
  pastels,
  iconAccent,
}: {
  visitor: VisitorWithFlat;
  onPress: () => void;
  pastels: ReturnType<typeof getPastels>;
  iconAccent: string;
}) {
  const typeLabel = visitor.type
    ? visitor.type.charAt(0).toUpperCase() + visitor.type.slice(1)
    : 'Guest';
  const stamp = visitor.responded_at || visitor.created_at;
  const tone = activityTone(visitor.status);
  const iconColor = tone === Brand.primary ? iconAccent : tone;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center gap-3 py-2.5"
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: pastels.rose }}
      >
        <DoorOpen color={iconColor} size={16} strokeWidth={1.5} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[14px] text-ink" style={{ fontFamily: FontFamily.heading }} numberOfLines={1}>
          {visitor.name}
        </Text>
        <Text className="mt-0.5 text-[12px] text-ink-muted" numberOfLines={1}>
          {typeLabel} · {activityLabel(visitor.status)} · {formatRelativeTime(stamp)}
        </Text>
      </View>
      {visitor.status === 'pending' ? (
        <View className="rounded-pill px-2 py-0.5" style={{ backgroundColor: pastels.peach }}>
          <Text className="text-[10px]" style={{ fontFamily: FontFamily.heading, color: Brand.accentDark }}>
            Act
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

type HubCard = {
  title: string;
  href: Href;
  Icon: typeof Vote;
  wash: PastelTone;
  tint: string;
  preview: string;
};

export default function ResidentHome() {
  const router = useRouter();
  const { pastels, isDark, primaryAccent } = useThemePalette();
  const profile = useAuthStore((s) => s.profile);
  const name = profile?.full_name?.split(' ')[0] ?? 'Resident';
  const societyId = profile?.society_id;
  const flatId = profile?.flat_id;
  const [actionId, setActionId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [actionError, setActionError] = useState<string | null>(null);

  const { visitors, isLoading, error, refresh } = useVisitorsRealtime({
    flatId,
    statuses: ['pending'],
    enabled: Boolean(flatId),
  });

  const recentGate = useVisitorsRealtime({
    flatId,
    enabled: Boolean(flatId),
    limit: 8,
  });

  const pollsQuery = useQuery({
    queryKey: queryKeys.polls(societyId ?? 'none'),
    queryFn: () => fetchPolls(societyId!),
    enabled: Boolean(societyId),
  });

  const amenitiesQuery = useQuery({
    queryKey: queryKeys.amenities(societyId ?? 'none'),
    queryFn: () => fetchAmenities(societyId!),
    enabled: Boolean(societyId),
  });

  const staffQuery = useQuery({
    queryKey: queryKeys.staff(societyId ?? 'none'),
    queryFn: () => fetchStaff(societyId!),
    enabled: Boolean(societyId),
  });

  useEffect(() => {
    const liveIds = new Set(visitors.map((v) => v.id));
    setDismissedIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (liveIds.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [visitors]);

  const pendingVisitors = useMemo(
    () => visitors.filter((v) => !dismissedIds.has(v.id)),
    [dismissedIds, visitors],
  );
  const pendingCount = pendingVisitors.length;
  const badges = useFeatureBadges();
  const unreadNotices = badges.notices;
  const openTickets = badges.helpdesk;

  const livePolls = useMemo(
    () =>
      (pollsQuery.data ?? []).filter(
        (p) => !isPollExpired(p.expires_at) && !isPollPublished(p),
      ).length,
    [pollsQuery.data],
  );

  const amenityCount = amenitiesQuery.data?.length ?? 0;

  const securityContacts = useMemo(() => {
    const staff = staffQuery.data ?? [];
    return staff.filter((s) => {
      const role = s.role.toLowerCase();
      return role.includes('security') || role.includes('guard') || role.includes('emergency');
    });
  }, [staffQuery.data]);

  const recentActivity = useMemo(() => {
    const rows = recentGate.visitors.slice(0, 5);
    return rows;
  }, [recentGate.visitors]);

  const handleDecision = useCallback(
    async (visitor: VisitorWithFlat, decision: SwipeDecision) => {
      if (!flatId || actionId) return;

      setActionId(visitor.id);
      setActionError(null);
      setDismissedIds((prev) => new Set(prev).add(visitor.id));

      const { error: updateError } = await updateVisitorStatus({
        visitorId: visitor.id,
        flatId,
        status: decision,
        createdBy: visitor.created_by,
        visitorName: visitor.name,
      });

      if (updateError) {
        setDismissedIds((prev) => {
          const next = new Set(prev);
          next.delete(visitor.id);
          return next;
        });
        setActionError(updateError);
      }

      setActionId(null);
    },
    [actionId, flatId],
  );

  const openSos = useCallback(() => {
    const security = securityContacts.find((s) => s.phone)?.phone ?? null;
    const personal = profile?.emergency_contact_phone?.trim() || null;
    const personalName = profile?.emergency_contact_name?.trim() || 'Emergency contact';

    const buttons: {
      text: string;
      style?: 'cancel' | 'destructive' | 'default';
      onPress?: () => void;
    }[] = [];

    if (security) {
      buttons.push({
        text: 'Call security',
        onPress: () => void Linking.openURL(`tel:${security}`),
      });
    }
    if (personal) {
      buttons.push({
        text: `Call ${personalName}`,
        onPress: () => void Linking.openURL(`tel:${personal}`),
      });
    }
    buttons.push({
      text: 'Open emergency directory',
      onPress: () => router.push(href('/(resident)/directory')),
    });
    buttons.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert(
      'Emergency SOS',
      security || personal
        ? 'Call society security or your personal emergency contact.'
        : 'No security or personal emergency number on file yet. Open the directory to find contacts.',
      buttons,
    );
  }, [securityContacts, profile?.emergency_contact_phone, profile?.emergency_contact_name, router]);

  const statusChip = !flatId
    ? 'Link a flat to get started'
    : isLoading && visitors.length === 0
      ? 'Checking for arrivals…'
      : pendingCount > 0
        ? `${pendingCount} waiting at the gate — swipe to decide`
        : 'All quiet · your society is secure';

  const statusDot = pendingCount > 0 ? Brand.accent : '#22C55E';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const hub: HubCard[] = [
    {
      title: 'Polls',
      href: href('/(resident)/polls'),
      Icon: Vote,
      wash: 'lilac',
      tint: '#F43F5E',
      preview:
        livePolls > 0
          ? `${livePolls} live poll${livePolls === 1 ? '' : 's'}`
          : 'No live polls',
    },
    {
      title: 'Helpdesk',
      href: href('/(resident)/helpdesk'),
      Icon: MessageSquare,
      wash: 'rose',
      tint: '#E11D48',
      preview:
        openTickets > 0
          ? `${openTickets} open ticket${openTickets === 1 ? '' : 's'}`
          : 'No open tickets',
    },
    {
      title: 'Amenities',
      href: href('/(resident)/amenities'),
      Icon: Building2,
      wash: 'mint',
      tint: primaryAccent,
      preview:
        amenityCount > 0
          ? `${amenityCount} facilit${amenityCount === 1 ? 'y' : 'ies'} · book today`
          : 'Book facilities',
    },
    {
      title: 'Directory',
      href: href('/(resident)/directory'),
      Icon: ClipboardList,
      wash: 'butter',
      tint: '#B08020',
      preview:
        securityContacts.length > 0
          ? `${securityContacts.length} security contact${securityContacts.length === 1 ? '' : 's'}`
          : 'Staff & emergency contacts',
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 88 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-3 flex-row items-center justify-between">
          <DrawerMenuButton />
          <View className="flex-row items-center gap-2.5">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Emergency SOS"
              onPress={openSos}
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: pastels.rose }}
            >
              <AlertTriangle color="#E11D48" size={18} strokeWidth={1.5} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="My profile"
              onPress={() => router.push(href('/(resident)/profile'))}
            >
              <InitialsAvatar
                name={profile?.full_name ?? 'You'}
                seed={profile?.id}
                size={40}
                imageUrl={profile?.avatar_url}
              />
            </Pressable>
          </View>
        </View>

        <View className="mb-3 overflow-hidden">
          <View
            className="overflow-hidden rounded-[24px]"
            style={{
              backgroundColor: isDark ? '#1F2C34' : '#9F1239',
              minHeight: 152,
            }}
          >
            <Image
              source={{ uri: SocietyImages.heroResidence }}
              style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '56%' }}
              contentFit="cover"
              transition={280}
            />
            {isDark ? (
              <LinearGradient
                colors={['#1F2C34', 'rgba(31,44,52,0.94)', 'rgba(31,44,52,0.48)', 'rgba(11,20,26,0.1)']}
                locations={[0, 0.38, 0.68, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
              />
            ) : (
              <LinearGradient
                colors={['#9F1239', 'rgba(159,18,57,0.94)', 'rgba(190,18,60,0.42)', 'rgba(190,18,60,0.08)']}
                locations={[0, 0.4, 0.68, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
              />
            )}
            {isDark ? (
              <LinearGradient
                colors={['transparent', 'rgba(11,20,26,0.55)']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
              />
            ) : (
              <LinearGradient
                colors={['rgba(255,241,245,0.12)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
              />
            )}
            <View className="justify-center px-4 py-4" style={{ minHeight: 152, maxWidth: '68%' }}>
              <Text className="text-[12px] text-white/80" style={{ fontFamily: FontFamily.medium }}>
                {greeting}
              </Text>
              <Text
                className="mt-1 text-[22px] leading-7 text-white"
                style={{ fontFamily: FontFamily.display }}
              >
                Hi, {name}
              </Text>
              <View className="mt-3 flex-row items-center self-start rounded-pill bg-white/15 px-3 py-1.5">
                <View className="mr-2 h-2 w-2 rounded-pill" style={{ backgroundColor: statusDot }} />
                <Text className="text-xs text-white/90" style={{ fontFamily: FontFamily.medium }}>
                  {statusChip}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 380, delay: 120 }}
          style={{ marginBottom: 16, marginTop: 12 }}
        >
          <AskPortlOrb onPress={() => router.push(href('/(resident)/ask-portl'))} />
        </MotiView>

        {(error || actionError) && (
          <View className="mt-1">
            <ErrorBanner
              message={actionError ?? error ?? ''}
              onRetry={() => {
                setActionError(null);
                void refresh();
                void recentGate.refresh();
              }}
            />
          </View>
        )}

        {isLoading && visitors.length === 0 ? (
          <View className="mt-4 items-center py-6">
            <ActivityIndicator color={Brand.primary} />
          </View>
        ) : pendingCount > 0 ? (
          <View className="mt-1 mb-2">
            <VisitorSwipeDeck
              visitors={pendingVisitors}
              busy={Boolean(actionId)}
              onDecision={handleDecision}
            />
          </View>
        ) : null}

        {/* Core daily use case — gate activity */}
        <View
          className="mb-4 overflow-hidden rounded-[22px] bg-surface-card"
          style={{
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 3,
          }}
        >
          <View className="flex-row items-center justify-between border-b border-surface-border px-4 py-3">
            <View className="flex-row items-center gap-2">
              <ShieldCheck color={Brand.primary} size={16} strokeWidth={1.5} />
              <Text className="text-[15px] text-ink" style={{ fontFamily: FontFamily.heading }}>
                At your gate
              </Text>
            </View>
            <Pressable
              onPress={() => router.push(href('/(resident)/visitors'))}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text className="text-xs" style={{ fontFamily: FontFamily.heading, color: Brand.primary }}>
                See all
              </Text>
            </Pressable>
          </View>

          <View className="px-4 py-1">
            {!flatId ? (
              <Text className="py-3 text-sm text-ink-muted">Link a flat to see gate activity.</Text>
            ) : recentGate.isLoading && recentActivity.length === 0 ? (
              <View className="items-center py-4">
                <ActivityIndicator color={Brand.primary} />
              </View>
            ) : recentActivity.length === 0 ? (
              <View className="items-center py-4">
                <GateAuthIllustration width={140} height={88} />
                <Text className="mt-2 px-2 text-center text-sm text-ink-muted">
                  No recent visitors — pre-approve guests before they arrive.
                </Text>
              </View>
            ) : (
              recentActivity.map((v) => (
                <GateActivityRow
                  key={v.id}
                  visitor={v}
                  pastels={pastels}
                  iconAccent={primaryAccent}
                  onPress={() => router.push(href('/(resident)/visitors'))}
                />
              ))
            )}
          </View>
        </View>

        {pendingCount === 0 ? (
          <SoftPromoCard
            title="Ready when guests arrive"
            subtitle="Pre-approve visitors so the gate never has to wait on you."
            tone="sky"
            onPress={() => router.push(href('/(resident)/pre-approve'))}
          />
        ) : null}

        <View className="mb-3 mt-2 flex-row items-center justify-between">
          <Text className="text-xl text-ink" style={{ fontFamily: FontFamily.display }}>
            Quick actions
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-6"
          contentContainerStyle={{ paddingRight: 8 }}
        >
          <QuickAction
            label="Ask Portl"
            icon={<Sparkles color={Brand.primary} size={22} strokeWidth={1.5} />}
            bg={pastels.rose}
            onPress={() => router.push(href('/(resident)/ask-portl'))}
          />
          <QuickAction
            label="Visitors"
            icon={<DoorOpen color={primaryAccent} size={22} strokeWidth={1.5} />}
            bg={pastels.sky}
            onPress={() => router.push(href('/(resident)/visitors'))}
            badge={badges.visitors || pendingCount}
          />
          <QuickAction
            label="Invite"
            icon={<UserPlus color={Brand.accent} size={22} strokeWidth={1.5} />}
            bg={pastels.peach}
            onPress={() => router.push(href('/(resident)/pre-approve'))}
          />
          <QuickAction
            label="Notices"
            icon={<Bell color="#7C6BA8" size={22} strokeWidth={1.5} />}
            bg={pastels.lilac}
            onPress={() => router.push(href('/(resident)/notices'))}
            badge={unreadNotices}
          />
          <QuickAction
            label="Requests"
            icon={<ClipboardList color="#B08020" size={22} strokeWidth={1.5} />}
            bg={pastels.butter}
            onPress={() => router.push(href('/(resident)/helpdesk'))}
            badge={openTickets}
          />
          <QuickAction
            label="Polls"
            icon={<Vote color="#7C6BA8" size={22} strokeWidth={1.5} />}
            bg={pastels.lilac}
            onPress={() => router.push(href('/(resident)/polls'))}
            badge={badges.polls}
          />
          <QuickAction
            label="Pay"
            icon={<Receipt color="#059669" size={22} strokeWidth={1.5} />}
            bg={pastels.mint}
            onPress={() => router.push(href('/(resident)/payments'))}
            badge={badges.payments}
          />
          <QuickAction
            label="Book"
            icon={<Building2 color={primaryAccent} size={22} strokeWidth={1.5} />}
            bg={pastels.mint}
            onPress={() => router.push(href('/(resident)/amenities'))}
          />
        </ScrollView>

        <Pressable
          onPress={() => router.push(href('/(resident)/amenities'))}
          accessibilityRole="button"
          accessibilityLabel="Book amenities"
          className="mb-5 overflow-hidden rounded-[22px]"
          style={{
            shadowColor: '#0F172A',
            shadowOpacity: 0.1,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 4,
          }}
        >
          <Image
            source={{ uri: SocietyImages.communityBanner }}
            style={{ width: '100%', height: 112 }}
            contentFit="cover"
            transition={280}
          />
          <LinearGradient
            colors={
              isDark
                ? ['rgba(11,20,26,0.12)', 'rgba(11,20,26,0.68)', 'rgba(11,20,26,0.9)']
                : ['rgba(15,23,42,0.1)', 'rgba(15,23,42,0.42)', 'rgba(15,23,42,0.68)']
            }
            locations={[0, 0.5, 1]}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
          />
          <View className="absolute bottom-0 left-0 right-0 flex-row items-end justify-between px-4 pb-3">
            <View className="min-w-0 flex-1 pr-3">
              <View
                className="mb-1.5 self-start rounded-pill px-2.5 py-1"
                style={{ backgroundColor: 'rgba(255,255,255,0.92)' }}
              >
                <Text className="text-[10px]" style={{ fontFamily: FontFamily.heading, color: Brand.primary }}>
                  Amenities
                </Text>
              </View>
              <Text className="text-[15px] text-white" style={{ fontFamily: FontFamily.display }} numberOfLines={1}>
                {amenityCount > 0
                  ? `${amenityCount} facilit${amenityCount === 1 ? 'y' : 'ies'} ready to book`
                  : 'Explore society facilities'}
              </Text>
            </View>
            <ChevronRight color="rgba(255,255,255,0.85)" size={18} strokeWidth={1.5} />
          </View>
        </Pressable>

        <Text className="mb-3 text-xl text-ink" style={{ fontFamily: FontFamily.display }}>
          Around your society
        </Text>

        <View className="flex-row flex-wrap justify-between gap-y-3">
          {hub.map((card, i) => (
            <MotiView
              key={card.title}
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 360, delay: 60 + i * 50 }}
              style={{ width: '48%' }}
            >
              <Pressable
                onPress={() => router.push(card.href)}
                accessibilityRole="button"
                accessibilityLabel={`${card.title}. ${card.preview}`}
                className="overflow-hidden rounded-[22px] active:opacity-90"
                style={{
                  backgroundColor: pastels[card.wash],
                  shadowColor: card.tint,
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 2,
                }}
              >
                <View className="p-3.5">
                  <View
                    className="mb-3 h-10 w-10 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)' }}
                  >
                    <card.Icon color={card.tint} size={20} strokeWidth={1.5} />
                  </View>
                  <Text className="text-[15px] text-ink" style={{ fontFamily: FontFamily.heading }}>
                    {card.title}
                  </Text>
                  <Text
                    className="mt-0.5 text-[12px] leading-4"
                    style={{
                      color: card.preview.startsWith('No ') ? Brand.inkMuted : card.tint,
                      fontFamily: FontFamily.heading,
                    }}
                  >
                    {card.preview}
                  </Text>
                </View>
              </Pressable>
            </MotiView>
          ))}
        </View>

        {/* Action tip — brand red */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 500, delay: 280 }}
          className="mt-4 overflow-hidden rounded-[22px]"
        >
          <LinearGradient
            colors={['#BE123C', '#E11D48']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 16 }}
          >
            <Text
              className="text-[11px] uppercase tracking-wide text-white/75"
              style={{ fontFamily: FontFamily.heading }}
            >
              Tip
            </Text>
            <Text className="mt-1 text-[16px] text-white" style={{ fontFamily: FontFamily.heading }}>
              Pre-approve expected guests
            </Text>
            <Text className="mt-1 text-[13px] leading-[18px] text-white/85">
              Guests you add ahead of time skip the wait — the gate can verify them immediately.
            </Text>
            <Pressable
              onPress={() => router.push(href('/(resident)/pre-approve'))}
              className="mt-3.5 self-start rounded-full bg-white px-4 py-2 active:opacity-85"
            >
              <Text className="text-[13px]" style={{ fontFamily: FontFamily.heading, color: Brand.accentDark }}>
                Pre-approve now
              </Text>
            </Pressable>
          </LinearGradient>
        </MotiView>

        <Pressable
          onPress={() => router.push(href('/(resident)/more'))}
          accessibilityRole="button"
          className="mt-4 mb-1 flex-row items-center gap-3 rounded-[22px] bg-surface-card px-4 py-3.5"
          style={{
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
            elevation: 1,
          }}
        >
          <View
            className="h-10 w-10 items-center justify-center rounded-card"
            style={{ backgroundColor: pastels.sage }}
          >
            <Phone color={primaryAccent} size={17} strokeWidth={1.5} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-[15px] text-ink" style={{ fontFamily: FontFamily.heading }}>
              More community tools
            </Text>
            <Text className="mt-0.5 text-xs text-ink-muted">Payments, history, and settings</Text>
          </View>
          <ChevronRight color={Brand.inkMuted} size={16} strokeWidth={1.5} />
        </Pressable>
      </ScrollView>
      <AskPortlFloatingFab onPress={() => router.push(href('/(resident)/ask-portl'))} />
      </View>
    </SafeAreaView>
  );
}
