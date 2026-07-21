import { useRouter } from 'expo-router';
import { Clock, ClipboardList, LogOut, QrCode, ScanLine, ShieldCheck, UserPlus } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { Brand, FontFamily, Gradients, Pastels } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { href } from '@/lib/href';
import { useVisitorsRealtime } from '@/hooks/use-visitors-realtime';
import { AnimatedPressable } from '@/components/ui/animated-pressable';

/** Gate action card with left accent strip. */
function GateCard({
  title,
  subtitle,
  icon,
  accentColor,
  bg,
  onPress,
  badge,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accentColor: string;
  bg: string;
  onPress: () => void;
  badge?: number;
}) {
  return (
    <AnimatedPressable onPress={onPress}>
      <View
        className="mb-3 overflow-hidden rounded-panel bg-surface-card"
        style={{
          shadowColor: accentColor,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          elevation: 3,
          flexDirection: 'row',
        }}
      >
        {/* Left accent strip */}
        <View style={{ width: 4, backgroundColor: accentColor }} />
        <View className="flex-1 flex-row items-center gap-3 p-4">
          <View
            className="h-12 w-12 items-center justify-center rounded-card"
            style={{ backgroundColor: bg }}
          >
            {icon}
          </View>
          <View className="flex-1">
            <Text className="text-base text-ink" style={{ fontFamily: FontFamily.heading }}>
              {title}
            </Text>
            <Text className="mt-0.5 text-sm text-ink-muted">{subtitle}</Text>
          </View>
          {badge !== undefined && badge > 0 ? (
            <View
              className="h-7 min-w-[28px] items-center justify-center rounded-pill px-2"
              style={{ backgroundColor: Brand.accent }}
            >
              <Text className="text-xs font-bold text-white" style={{ fontFamily: FontFamily.heading }}>
                {badge > 99 ? '99+' : badge}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default function GuardHomeRedirect() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const name = profile?.full_name?.split(' ')[0] ?? 'Guard';

  // Live pending count for badge
  const { visitors } = useVisitorsRealtime({
    societyId: profile?.society_id,
    statuses: ['pending'],
    enabled: Boolean(profile?.society_id),
  });
  const pendingCount = visitors.length;

  // Shift start time — format from login time or just show current time
  const shiftSince = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Brand.surface }}>
      {/* Guard-tinted hero header */}
      <LinearGradient
        colors={[...Gradients.guardHero]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}
      >
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-xs text-white/60" style={{ fontFamily: FontFamily.medium }}>
              Gate Desk
            </Text>
            <Text
              className="mt-0.5 text-2xl font-bold text-white"
              style={{ fontFamily: FontFamily.display }}
            >
              {name}
            </Text>
          </View>
          {/* Shift status chip */}
          <View className="flex-row items-center rounded-pill bg-white/15 px-3 py-1.5">
            <View className="mr-2 h-2 w-2 rounded-pill bg-green-400" />
            <Clock color="rgba(255,255,255,0.9)" size={12} strokeWidth={1.5} />
            <Text className="ml-1 text-xs text-white/90" style={{ fontFamily: FontFamily.medium }}>
              On duty · {shiftSince}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-3 text-base text-ink-muted" style={{ fontFamily: FontFamily.medium }}>
          Gate tools
        </Text>

        <GateCard
          title="Pending approvals"
          subtitle="Waiting for resident decision"
          icon={<ShieldCheck color="#C0392B" size={22} strokeWidth={1.5} />}
          accentColor="#C0392B"
          bg={Pastels.rose}
          onPress={() => router.push(href('/(guard)/dashboard'))}
          badge={pendingCount}
        />
        <GateCard
          title="Register visitor"
          subtitle="Capture photo and flat details"
          icon={<UserPlus color={Brand.primary} size={22} strokeWidth={1.5} />}
          accentColor={Brand.primary}
          bg={Pastels.mint}
          onPress={() => router.push(href('/(guard)/register-visitor'))}
        />
        <GateCard
          title="Entry & verify"
          subtitle="Check in approved visitors"
          icon={<ScanLine color="#2563EB" size={22} strokeWidth={1.5} />}
          accentColor="#2563EB"
          bg={Pastels.sky}
          onPress={() => router.push(href('/(guard)/verify'))}
        />
        <GateCard
          title="Visitor logs"
          subtitle="Entry and exit history"
          icon={<ClipboardList color="#C4861A" size={22} strokeWidth={1.5} />}
          accentColor="#C4861A"
          bg={Pastels.butter}
          onPress={() => router.push(href('/(guard)/logs'))}
        />

        <Pressable
          onPress={async () => {
            await signOut();
            router.replace('/(auth)/login');
          }}
          className="mt-2 flex-row items-center justify-center gap-2 rounded-card py-3.5"
          style={{ backgroundColor: `${Brand.accent}15` }}
        >
          <LogOut color={Brand.accent} size={16} strokeWidth={1.5} />
          <Text className="font-semibold" style={{ color: Brand.accent, fontFamily: FontFamily.heading }}>
            Sign out
          </Text>
        </Pressable>
      </ScrollView>

      {/* Fixed bottom FAB — Scan QR */}
      <View
        className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4"
        style={{ backgroundColor: 'transparent' }}
      >
        <Pressable
          onPress={() => router.push(href('/(guard)/scan-pass'))}
          className="flex-row items-center justify-center gap-3 rounded-card py-4"
          style={{
            backgroundColor: Brand.primary,
            shadowColor: Brand.primary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.35,
            shadowRadius: 18,
            elevation: 8,
          }}
        >
          <QrCode color="#fff" size={20} strokeWidth={1.5} />
          <Text className="text-base font-bold text-white" style={{ fontFamily: FontFamily.heading }}>
            Scan QR / Register Visitor
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
