import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';

import { Brand, FontFamily } from '@/constants/theme';
import { useThemePalette } from '@/hooks/use-theme';

type AskPortlOrbProps = {
  onPress?: () => void;
  /** Compact circle only (Meta AI–style FAB). */
  compact?: boolean;
  /** Optional label beside the orb (Ask Meta AI–style chip). */
  label?: string;
  size?: number;
  /** Decorative only — no press target (e.g. chat header). */
  decorative?: boolean;
};

/**
 * Custom Ask Portl mark — portal aperture + AI spark
 * (Meta AI–style distinctive glyph, Portl rose branded).
 */
function AskPortlMark({ size }: { size: number }) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 48 48">
      <Defs>
        <RadialGradient id="portlCore" cx="36%" cy="32%" r="68%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <Stop offset="55%" stopColor="#FFE4E8" stopOpacity="0.9" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.75" />
        </RadialGradient>
      </Defs>
      {/* Soft inner disc */}
      <Circle cx="24" cy="24" r="11.5" fill="url(#portlCore)" opacity={0.22} />
      {/* Portal rings — interlocking arcs */}
      <G stroke="#FFFFFF" strokeWidth={2.35} fill="none" strokeLinecap="round">
        <Path d="M15.5 24c0-5.2 3.6-9.5 8.5-9.5" opacity={0.95} />
        <Path d="M32.5 24c0 5.2-3.6 9.5-8.5 9.5" opacity={0.95} />
        <Path d="M24 15.5c5.2 0 9.5 3.6 9.5 8.5" opacity={0.72} />
        <Path d="M24 32.5c-5.2 0-9.5-3.6-9.5-8.5" opacity={0.72} />
      </G>
      {/* Center AI spark — 4-point star */}
      <Path
        d="M24 17.2l1.15 4.35L29.5 22.7l-4.35 1.15L24 28.2l-1.15-4.35L18.5 22.7l4.35-1.15L24 17.2z"
        fill="#FFFFFF"
      />
      {/* Tiny satellite sparks */}
      <Circle cx="33.8" cy="16.2" r="1.15" fill="#FFFFFF" opacity={0.9} />
      <Circle cx="14.6" cy="31.4" r="0.9" fill="#FFFFFF" opacity={0.75} />
    </Svg>
  );
}

function OrbGradient({ size, isDark }: { size: number; isDark: boolean }) {
  const markSize = Math.round(size * 0.58);
  const glowPad = Math.round(size * 0.14);

  return (
    <View style={{ width: size + glowPad * 2, height: size + glowPad * 2, alignItems: 'center', justifyContent: 'center' }}>
      {/* Soft outer aura */}
      <MotiView
        from={{ opacity: 0.35, scale: 0.92 }}
        animate={{ opacity: 0.7, scale: 1.08 }}
        transition={{
          type: 'timing',
          duration: 2400,
          loop: true,
          repeatReverse: true,
        }}
        style={{
          position: 'absolute',
          width: size + glowPad * 2,
          height: size + glowPad * 2,
          borderRadius: (size + glowPad * 2) / 2,
          backgroundColor: isDark ? 'rgba(255,107,129,0.28)' : 'rgba(225,29,72,0.18)',
        }}
      />

      {/* Slow rotating iridescent shell — Meta AI–style color wash */}
      <MotiView
        from={{ rotate: '0deg' }}
        animate={{ rotate: '360deg' }}
        transition={{
          type: 'timing',
          duration: 14000,
          loop: true,
          repeatReverse: false,
        }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          shadowColor: Brand.primary,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.5 : 0.28,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        <LinearGradient
          colors={
            isDark
              ? ['#FF8FA3', '#E11D48', '#F59E0B', '#FB7185', '#BE123C', '#FF6B81']
              : ['#FDA4AF', '#E11D48', '#FBBF24', '#FB7185', '#BE123C', '#FECDD3']
          }
          locations={[0, 0.22, 0.42, 0.62, 0.82, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Glass highlight */}
          <LinearGradient
            colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.08)', 'transparent']}
            locations={[0, 0.35, 1]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 0.7 }}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
            }}
          />
          {/* Inner depth ring */}
          <View
            style={{
              position: 'absolute',
              left: size * 0.08,
              top: size * 0.08,
              width: size * 0.84,
              height: size * 0.84,
              borderRadius: size * 0.42,
              borderWidth: 1.5,
              borderColor: 'rgba(255,255,255,0.28)',
            }}
          />
        </LinearGradient>
      </MotiView>

      {/* Counter-stable mark (doesn't spin with the shell) */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MotiView
          from={{ scale: 0.94, opacity: 0.88 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'timing', duration: 1800, loop: true }}
        >
          <AskPortlMark size={markSize} />
        </MotiView>
      </View>
    </View>
  );
}

/**
 * WhatsApp Meta AI–inspired entry: animated gradient orb + optional “Ask Portl” chip.
 */
export function AskPortlOrb({
  onPress,
  compact = false,
  label = 'Ask Portl',
  size = 52,
  decorative = false,
}: AskPortlOrbProps) {
  const { isDark } = useThemePalette();
  const orb = <OrbGradient size={size} isDark={isDark} />;

  if (decorative || !onPress) {
    if (compact) return orb;
    return (
      <View
        className="flex-row items-center overflow-hidden rounded-pill"
        style={{
          backgroundColor: isDark ? 'rgba(31,44,52,0.96)' : 'rgba(255,255,255,0.96)',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(42,57,66,0.95)' : 'rgba(232,232,234,0.95)',
          paddingVertical: 6,
          paddingLeft: 6,
          paddingRight: 16,
          gap: 10,
        }}
      >
        {orb}
        <View>
          <Text className="text-[14px] text-ink" style={{ fontFamily: FontFamily.heading }}>
            {label}
          </Text>
          <Text className="text-[11px] text-ink-muted" style={{ fontFamily: FontFamily.body }}>
            Guests · amenities · notices
          </Text>
        </View>
      </View>
    );
  }

  if (compact) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Ask Portl"
        hitSlop={8}
        style={{
          shadowColor: Brand.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.45 : 0.32,
          shadowRadius: 16,
          elevation: 8,
        }}
      >
        {orb}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="flex-row items-center overflow-hidden rounded-pill active:opacity-90"
      style={{
        backgroundColor: isDark ? 'rgba(31,44,52,0.96)' : 'rgba(255,255,255,0.96)',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(42,57,66,0.95)' : 'rgba(232,232,234,0.95)',
        paddingVertical: 6,
        paddingLeft: 6,
        paddingRight: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: isDark ? 0.4 : 0.1,
        shadowRadius: 14,
        elevation: 6,
        gap: 10,
      }}
    >
      {orb}
      <View>
        <Text className="text-[14px] text-ink" style={{ fontFamily: FontFamily.heading }}>
          {label}
        </Text>
        <Text className="text-[11px] text-ink-muted" style={{ fontFamily: FontFamily.body }}>
          Guests · amenities · notices
        </Text>
      </View>
    </Pressable>
  );
}

/** Floating Meta AI–style orb for dashboard overlays. */
export function AskPortlFloatingFab({ onPress }: { onPress: () => void }) {
  const { isDark } = useThemePalette();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        right: 18,
        bottom: 18,
        zIndex: 40,
      }}
    >
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 420, delay: 280 }}
        style={{ alignItems: 'center' }}
      >
        <AskPortlOrb onPress={onPress} compact size={56} />
        <View
          pointerEvents="none"
          style={{
            marginTop: 6,
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 4,
            backgroundColor: isDark ? 'rgba(31,44,52,0.92)' : 'rgba(255,255,255,0.94)',
            borderWidth: 1,
            borderColor: isDark ? '#2A3942' : '#E8E8EA',
          }}
        >
          <Text className="text-[10px] text-ink" style={{ fontFamily: FontFamily.heading }}>
            Ask Portl
          </Text>
        </View>
      </MotiView>
    </View>
  );
}
