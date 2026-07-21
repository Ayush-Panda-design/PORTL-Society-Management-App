import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { FontFamily, Radii, Spacing } from '@/constants/theme';
import { appStorage } from '@/lib/app-storage';

/** Amber-gold sampled from the hero sconces / sunset — not the generic brand orange. */
const HERO_GOLD = '#E09A3C';
const HERO_GOLD_DEEP = '#C47A28';

const WELCOME_SEEN_KEY = 'portl_welcome_seen';

function PortlGateMark({ size = 36, color = HERO_GOLD }: { size?: number; color?: string }) {
  // Simplified gate: twin pillars + arch — reads as “portal / gate,” not a generic blob.
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Rect x="4" y="10" width="5" height="22" rx="1.5" fill={color} />
      <Rect x="27" y="10" width="5" height="22" rx="1.5" fill={color} />
      <Path
        d="M9 16.5C9 11.5 12.8 8 18 8s9 3.5 9 8.5"
        stroke={color}
        strokeWidth={3.2}
        strokeLinecap="round"
      />
      <Path
        d="M15.5 32V20.5c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5V32"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}

type EnterMotion = {
  from: { opacity: number; translateY: number };
  animate: { opacity: number; translateY: number };
  transition: { type: 'timing'; duration: number; delay?: number };
};

function enterMotion(skip: boolean, translateY: number, duration: number, delay = 0): EnterMotion {
  if (skip) {
    return {
      from: { opacity: 1, translateY: 0 },
      animate: { opacity: 1, translateY: 0 },
      transition: { type: 'timing', duration: 0 },
    };
  }
  return {
    from: { opacity: 0, translateY },
    animate: { opacity: 1, translateY: 0 },
    transition: { type: 'timing', duration, delay },
  };
}

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [skipMotion, setSkipMotion] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const seen = await appStorage.getItem(WELCOME_SEEN_KEY);
      if (cancelled) return;
      if (seen === '1') {
        setSkipMotion(true);
      } else {
        setSkipMotion(false);
        void appStorage.setItem(WELCOME_SEEN_KEY, '1');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const brandMotion = enterMotion(skipMotion === true, -8, 700);
  const copyMotion = enterMotion(skipMotion === true, 24, 760, 140);
  const ctaMotion = enterMotion(skipMotion === true, 18, 700, 300);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Image
        source={require('@/assets/images/welcome-hero.jpg')}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        transition={400}
        accessibilityIgnoresInvertColors
      />

      {/* Top scrim — keeps status bar / notch icons legible over bright sky */}
      <LinearGradient
        colors={['rgba(8, 14, 12, 0.72)', 'rgba(8, 14, 12, 0.28)', 'transparent']}
        locations={[0, 0.55, 1]}
        style={styles.topScrim}
      />

      {/* Bottom scrim — full dark plane under headline + both CTAs for ≥4.5:1 text */}
      <LinearGradient
        colors={['transparent', 'rgba(8, 14, 12, 0.55)', 'rgba(8, 14, 12, 0.92)', 'rgba(8, 14, 12, 0.98)']}
        locations={[0, 0.22, 0.55, 1]}
        style={styles.bottomScrim}
      />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: Math.max(insets.bottom, Spacing.lg) + Spacing.lg,
          },
        ]}
      >
        {skipMotion !== null ? (
          <MotiView
            from={brandMotion.from}
            animate={brandMotion.animate}
            transition={brandMotion.transition}
            style={styles.brandBlock}
          >
            <View style={styles.brandRow}>
              <PortlGateMark size={34} />
              <Text style={styles.brandWord}>Portl</Text>
            </View>
            {/* Secondary cues — half the weight of headline/CTA */}
            <Text style={styles.rolesLine}>Resident · Guard · Admin</Text>
            <Text style={styles.trustLine}>Your data stays private to your society</Text>
          </MotiView>
        ) : (
          <View style={styles.brandBlock} />
        )}

        <View style={styles.spacer} pointerEvents="none" />

        {skipMotion !== null ? (
          <View>
            <MotiView
              from={copyMotion.from}
              animate={copyMotion.animate}
              transition={copyMotion.transition}
            >
              <Text style={styles.headline}>Your society,{'\n'}securely connected</Text>
              <Text style={styles.sub}>
                Approve visitors, pay dues, and get notices — right from your phone.
              </Text>
            </MotiView>

            <MotiView
              from={ctaMotion.from}
              animate={ctaMotion.animate}
              transition={ctaMotion.transition}
              style={styles.ctaBlock}
            >
              <Pressable
                onPress={() => router.push('/(auth)/signup' as Href)}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Set up your society"
              >
                <LinearGradient
                  colors={[HERO_GOLD, HERO_GOLD_DEEP]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryBtnFill}
                >
                  <Text style={styles.primaryBtnText}>Set up your society</Text>
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={() => router.push('/(auth)/login' as Href)}
                style={({ pressed }) => [
                  styles.signInBtn,
                  pressed && { opacity: 0.78, backgroundColor: 'rgba(255,255,255,0.06)' },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Sign in"
              >
                <Text style={styles.signInText}>Sign in</Text>
              </Pressable>
            </MotiView>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#080E0C',
  },
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  bottomScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '58%',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl + Spacing.sm, // 32
    justifyContent: 'space-between',
  },
  brandBlock: {
    gap: Spacing.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  brandWord: {
    fontFamily: FontFamily.wordmark,
    fontSize: 38,
    letterSpacing: -1.6,
    color: '#FFFFFF',
  },
  rolesLine: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.58)',
    letterSpacing: 0.4,
    paddingLeft: 34 + Spacing.md, // align under wordmark
  },
  trustLine: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.15,
    paddingLeft: 34 + Spacing.md,
    marginTop: -2,
  },
  spacer: {
    flex: 1,
  },
  headline: {
    fontFamily: FontFamily.display,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.5,
    color: '#FFFFFF',
    marginBottom: Spacing.md,
  },
  sub: {
    fontFamily: FontFamily.body,
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.86)',
    maxWidth: 320,
  },
  ctaBlock: {
    marginTop: Spacing.xxl,
    gap: Spacing.lg,
  },
  primaryBtn: {
    borderRadius: Radii.pill,
    overflow: 'hidden',
    shadowColor: HERO_GOLD,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 8,
  },
  primaryBtnFill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg + 2,
    paddingHorizontal: Spacing.xl,
  },
  primaryBtnText: {
    fontFamily: FontFamily.heading,
    fontSize: 17,
    color: '#FFFFFF',
    letterSpacing: 0.15,
  },
  signInBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md + 2,
    borderRadius: Radii.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255,255,255,0.42)',
  },
  signInText: {
    fontFamily: FontFamily.heading,
    fontSize: 16,
    color: 'rgba(255,255,255,0.96)',
    letterSpacing: 0.2,
  },
});
