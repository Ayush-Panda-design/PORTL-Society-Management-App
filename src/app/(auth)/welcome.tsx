import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { FontFamily, Radii, Spacing } from '@/constants/theme';
import { appStorage } from '@/lib/app-storage';

/** Brand rose — matches Portl primary CTAs and app icon. */
const BRAND = '#E11D48';
const BRAND_DEEP = '#BE123C';
const INK = '#0B141A';

const WELCOME_SEEN_KEY = 'portl_welcome_seen';

function PortlGateMark({ size = 36, color = BRAND }: { size?: number; color?: string }) {
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
  from: { opacity: number; translateY: number; scale?: number };
  animate: { opacity: number; translateY: number; scale?: number };
  transition: { type: 'timing'; duration: number; delay?: number };
};

function enterMotion(
  skip: boolean,
  translateY: number,
  duration: number,
  delay = 0,
  scaleFrom = 1,
): EnterMotion {
  if (skip) {
    return {
      from: { opacity: 1, translateY: 0, scale: 1 },
      animate: { opacity: 1, translateY: 0, scale: 1 },
      transition: { type: 'timing', duration: 0 },
    };
  }
  return {
    from: { opacity: 0, translateY, scale: scaleFrom },
    animate: { opacity: 1, translateY: 0, scale: 1 },
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

  const heroMotion = enterMotion(skipMotion === true, 0, 1400, 0, 1.08);
  const brandMotion = enterMotion(skipMotion === true, -10, 720);
  const copyMotion = enterMotion(skipMotion === true, 28, 780, 160);
  const ctaMotion = enterMotion(skipMotion === true, 22, 720, 320);

  const goSignup = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(auth)/signup' as Href);
  };

  const goLogin = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(auth)/login' as Href);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {skipMotion !== null ? (
        <MotiView
          from={heroMotion.from}
          animate={heroMotion.animate}
          transition={heroMotion.transition}
          style={StyleSheet.absoluteFill}
        >
          <Image
            source={require('@/assets/images/welcome-hero.jpg')}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={500}
            accessibilityIgnoresInvertColors
          />
        </MotiView>
      ) : (
        <Image
          source={require('@/assets/images/welcome-hero.jpg')}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
      )}

      {/* Soft top veil — status bar + brand stay readable over bright sky */}
      <LinearGradient
        colors={['rgba(11, 20, 26, 0.55)', 'rgba(11, 20, 26, 0.18)', 'transparent']}
        locations={[0, 0.55, 1]}
        style={styles.topScrim}
      />

      {/* Deep bottom plane — Airbnb/Spotify pattern: photo breathes, copy sits on ink */}
      <LinearGradient
        colors={[
          'transparent',
          'rgba(11, 20, 26, 0.25)',
          'rgba(11, 20, 26, 0.78)',
          'rgba(11, 20, 26, 0.96)',
        ]}
        locations={[0, 0.18, 0.52, 1]}
        style={styles.bottomScrim}
      />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: Math.max(insets.bottom, Spacing.lg) + Spacing.md,
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
              <View style={styles.markDisc}>
                {Platform.OS === 'ios' ? (
                  <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
                ) : (
                  <View style={[StyleSheet.absoluteFill, styles.markDiscAndroid]} />
                )}
                <PortlGateMark size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.brandWord}>Portl</Text>
            </View>
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
                onPress={goSignup}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Set up your society"
              >
                <LinearGradient
                  colors={[BRAND, BRAND_DEEP]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryBtnFill}
                >
                  <Text style={styles.primaryBtnText}>Set up your society</Text>
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={goLogin}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Sign in"
              >
                {Platform.OS === 'ios' ? (
                  <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                ) : (
                  <View style={[StyleSheet.absoluteFill, styles.secondaryBtnAndroid]} />
                )}
                <Text style={styles.signInText}>Sign in</Text>
              </Pressable>

              <Text style={styles.trustLine}>Private to your society · Resident · Guard · Admin</Text>
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
    backgroundColor: INK,
    overflow: 'hidden',
  },
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  bottomScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '62%',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl + Spacing.sm,
    justifyContent: 'space-between',
  },
  brandBlock: {
    minHeight: 56,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  markDisc: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(225, 29, 72, 0.55)',
  },
  markDiscAndroid: {
    backgroundColor: 'rgba(225, 29, 72, 0.72)',
  },
  brandWord: {
    fontFamily: FontFamily.wordmark,
    fontSize: 42,
    letterSpacing: -1.8,
    color: '#FFFFFF',
  },
  spacer: {
    flex: 1,
  },
  headline: {
    fontFamily: FontFamily.display,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.8,
    color: '#FFFFFF',
    marginBottom: Spacing.md,
  },
  sub: {
    fontFamily: FontFamily.body,
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.82)',
    maxWidth: 340,
  },
  ctaBlock: {
    marginTop: Spacing.xxl,
    gap: Spacing.md,
  },
  primaryBtn: {
    borderRadius: Radii.lg,
    overflow: 'hidden',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.38,
    shadowRadius: 20,
    elevation: 10,
  },
  primaryBtnFill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg + 4,
    paddingHorizontal: Spacing.xl,
  },
  primaryBtnText: {
    fontFamily: FontFamily.heading,
    fontSize: 17,
    color: '#FFFFFF',
    letterSpacing: 0.15,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg + 2,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  secondaryBtnAndroid: {
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  signInText: {
    fontFamily: FontFamily.heading,
    fontSize: 16,
    color: 'rgba(255,255,255,0.96)',
    letterSpacing: 0.2,
  },
  trustLine: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
    color: 'rgba(255,255,255,0.48)',
    textAlign: 'center',
  },
});
