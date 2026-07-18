import type { ComponentType } from 'react';
import { View } from 'react-native';
import { MotiView } from 'moti';
import {
  Bell,
  Building2,
  CalendarDays,
  ClipboardList,
  Headphones,
  Home,
  ShieldCheck,
  UserRound,
  Users,
  WifiOff,
  type LucideProps,
} from 'lucide-react-native';

import { Brand, Pastels } from '@/constants/theme';

export type EmptyVisual =
  | 'default'
  | 'notices'
  | 'visitors'
  | 'polls'
  | 'helpdesk'
  | 'amenities'
  | 'gate'
  | 'disconnected'
  | 'residents'
  | 'staff'
  | 'towers'
  | 'flats'
  | 'invites';

type LucideIcon = ComponentType<LucideProps>;

type Scene = {
  Icon: LucideIcon;
  Accent: LucideIcon;
  wash: string;
  accent: string;
  layout: 'stack' | 'orbit' | 'split' | 'badge';
};

const SCENES: Record<EmptyVisual, Scene> = {
  default: {
    Icon: ClipboardList,
    Accent: Home,
    wash: Pastels.sage,
    accent: Brand.primary,
    layout: 'stack',
  },
  notices: {
    Icon: Bell,
    Accent: ClipboardList,
    wash: Pastels.butter,
    accent: Brand.accent,
    layout: 'orbit',
  },
  visitors: {
    Icon: Users,
    Accent: UserRound,
    wash: Pastels.sky,
    accent: '#3B82F6',
    layout: 'split',
  },
  polls: {
    Icon: ClipboardList,
    Accent: Bell,
    wash: Pastels.lilac,
    accent: '#7C3AED',
    layout: 'badge',
  },
  helpdesk: {
    Icon: Headphones,
    Accent: ClipboardList,
    wash: Pastels.rose,
    accent: '#C0392B',
    layout: 'orbit',
  },
  amenities: {
    Icon: CalendarDays,
    Accent: Building2,
    wash: Pastels.mint,
    accent: Brand.primary,
    layout: 'split',
  },
  gate: {
    Icon: ShieldCheck,
    Accent: UserRound,
    wash: Pastels.peach,
    accent: Brand.accentDark,
    layout: 'badge',
  },
  disconnected: {
    Icon: WifiOff,
    Accent: Home,
    wash: Pastels.coral,
    accent: '#9CA3AF',
    layout: 'stack',
  },
  residents: {
    Icon: Users,
    Accent: Home,
    wash: Pastels.sky,
    accent: '#1F3A6B',
    layout: 'orbit',
  },
  staff: {
    Icon: ShieldCheck,
    Accent: Users,
    wash: Pastels.sage,
    accent: Brand.primaryDark,
    layout: 'split',
  },
  towers: {
    Icon: Building2,
    Accent: Home,
    wash: Pastels.mint,
    accent: Brand.primary,
    layout: 'badge',
  },
  flats: {
    Icon: Home,
    Accent: Building2,
    wash: Pastels.butter,
    accent: Brand.primaryMid,
    layout: 'stack',
  },
  invites: {
    Icon: UserRound,
    Accent: ClipboardList,
    wash: Pastels.lilac,
    accent: '#5B8DD9',
    layout: 'orbit',
  },
};

/**
 * Brand-tinted empty illustrations (Dribbble / unDraw–inspired).
 * Soft wash + floating accent chip + hero icon — unique per segment.
 */
export function EmptyIllustration({ kind }: { kind: EmptyVisual }) {
  const scene = SCENES[kind] ?? SCENES.default;
  const { Icon, Accent, wash, accent, layout } = scene;

  return (
    <View className="h-44 w-44 items-center justify-center">
      <MotiView
        from={{ opacity: 0, scale: 0.86 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 14 }}
        className="absolute h-40 w-40 rounded-full"
        style={{ backgroundColor: wash }}
      />
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 0.55, translateY: 0 }}
        transition={{ type: 'timing', duration: 700, delay: 80 }}
        className="absolute h-24 w-24 rounded-full"
        style={{
          backgroundColor: `${accent}22`,
          top: layout === 'orbit' ? 8 : 18,
          right: layout === 'split' ? 4 : 16,
        }}
      />

      {layout === 'orbit' || layout === 'badge' ? (
        <MotiView
          from={{ opacity: 0, scale: 0.6, translateY: -6 }}
          animate={{ opacity: 1, scale: 1, translateY: -5 }}
          transition={{
            translateY: {
              type: 'timing',
              duration: 2200,
              loop: true,
              repeatReverse: true,
            },
            opacity: { type: 'timing', duration: 400, delay: 120 },
            scale: { type: 'spring', damping: 12, delay: 120 },
          }}
          className="absolute items-center justify-center rounded-2xl bg-white"
          style={{
            width: 44,
            height: 44,
            top: 18,
            right: 22,
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 3,
          }}
        >
          <Accent color={accent} size={22} strokeWidth={1.5} />
        </MotiView>
      ) : null}

      <MotiView
        from={{ opacity: 0, scale: 0.7, translateY: 12 }}
        animate={{ opacity: 1, scale: 1, translateY: -6 }}
        transition={{
          translateY: {
            type: 'timing',
            duration: 2600,
            loop: true,
            repeatReverse: true,
          },
          opacity: { type: 'spring', damping: 13, delay: 60 },
          scale: { type: 'spring', damping: 13, delay: 60 },
        }}
        className="items-center justify-center rounded-[28px] bg-white"
        style={{
          width: layout === 'split' ? 96 : 108,
          height: layout === 'split' ? 96 : 108,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 4,
        }}
      >
        <Icon color={accent} size={layout === 'badge' ? 40 : 46} strokeWidth={1.5} />
      </MotiView>

      {layout === 'split' || layout === 'stack' ? (
        <MotiView
          from={{ opacity: 0, scale: 0.5, translateX: -8 }}
          animate={{ opacity: 1, scale: 1, translateX: 0 }}
          transition={{ type: 'spring', damping: 12, delay: 180 }}
          className="absolute items-center justify-center rounded-full bg-white"
          style={{
            width: 40,
            height: 40,
            bottom: 16,
            left: 18,
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
            elevation: 2,
          }}
        >
          <Accent color={accent} size={18} strokeWidth={1.5} />
        </MotiView>
      ) : null}
    </View>
  );
}
