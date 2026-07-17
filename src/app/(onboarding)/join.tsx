import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChipSelector } from '@/components/ui/chip-selector';
import { Brand, FontFamily, Gradients } from '@/constants/theme';
import { joinSociety, resolveInviteCode } from '@/lib/society-api';
import { useAuthStore } from '@/stores/authStore';
import type { ResolvedInvite } from '@/types/database';

export default function JoinSocietyScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  const [code, setCode] = useState('');
  const [resolved, setResolved] = useState<ResolvedInvite | null>(null);
  const [flatId, setFlatId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const flatOptions = useMemo(
    () =>
      (resolved?.flats ?? []).map((f) => ({
        value: f.id,
        label: `${f.tower_name} · ${f.number}`,
      })),
    [resolved?.flats],
  );

  const onLookup = async () => {
    setError(null);
    setResolved(null);
    setFlatId('');
    if (code.trim().length < 4) {
      setError('Enter the invite code from your society');
      return;
    }
    setLookingUp(true);
    try {
      const result = await resolveInviteCode(code.trim());
      setResolved(result);
      if (result.role === 'resident' && result.flats.length > 0) {
        setFlatId(result.flats[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid invite code');
    } finally {
      setLookingUp(false);
    }
  };

  const onJoin = async () => {
    setError(null);
    if (!resolved) {
      setError('Look up your invite code first');
      return;
    }
    if (resolved.role === 'resident') {
      if (!flatId) {
        setError('Select your flat');
        return;
      }
      if (resolved.flats.length === 0) {
        setError('This society has no flats yet. Ask your admin to add towers and flats first.');
        return;
      }
    }

    setSubmitting(true);
    try {
      await joinSociety({
        code: code.trim(),
        flatId: resolved.role === 'resident' ? flatId : null,
      });
      if (user?.id) await fetchProfile(user.id);
      router.replace('/(onboarding)/pending');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join society');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
        bounces={false}
      >
        <LinearGradient
          colors={[...Gradients.auth]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: 12, paddingBottom: 20 }}
        >
          <SafeAreaView edges={['top']}>
            <View className="px-6 pt-2">
              <Pressable onPress={() => router.back()} className="mb-4 self-start">
                <Text className="text-sm text-white/90">Back</Text>
              </Pressable>
              <Text
                className="mb-1 text-3xl text-white"
                style={{ fontFamily: FontFamily.display }}
              >
                Join society
              </Text>
              <Text className="text-sm text-white/85">
                Use the resident or guard invite code shared with you
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View className="-mt-4 flex-1 rounded-t-3xl bg-surface px-6 pb-10 pt-7">
          <View className="mb-3 gap-2">
            <Text className="text-sm font-medium text-ink-soft">Invite code</Text>
            <TextInput
              className="rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-center text-xl tracking-widest text-ink"
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="ABCD2345"
              placeholderTextColor="#94A3B8"
              value={code}
              onChangeText={(v) => {
                setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12));
                setResolved(null);
              }}
              maxLength={12}
            />
          </View>

          <Pressable
            className={`mb-5 items-center rounded-xl border border-brand-700 py-3 ${lookingUp ? 'opacity-70' : ''}`}
            disabled={lookingUp}
            onPress={() => void onLookup()}
          >
            {lookingUp ? (
              <ActivityIndicator color={Brand.primary} />
            ) : (
              <Text className="text-base font-semibold text-brand-800">Look up code</Text>
            )}
          </Pressable>

          {resolved ? (
            <View className="mb-5 rounded-2xl border border-surface-border bg-surface-card p-4">
              <Text className="text-xs uppercase text-ink-faint">Joining as</Text>
              <Text className="mt-1 text-lg text-ink" style={{ fontFamily: FontFamily.heading }}>
                {resolved.role === 'resident' ? 'Resident' : 'Guard'}
              </Text>
              <Text className="mt-3 text-base text-ink" style={{ fontFamily: FontFamily.heading }}>
                {resolved.society_name}
              </Text>
              <Text className="text-sm text-ink-muted">{resolved.society_address}</Text>

              {resolved.role === 'resident' ? (
                <View className="mt-4">
                  <Text className="mb-2 text-sm font-medium text-ink-soft">Your flat</Text>
                  {flatOptions.length === 0 ? (
                    <Text className="text-sm text-status-rejected">
                      No flats configured yet. Ask admin to add towers and flats, then try again.
                    </Text>
                  ) : (
                    <ChipSelector
                      title="Select flat"
                      presentation="sheet"
                      options={flatOptions}
                      value={flatId || flatOptions[0]?.value || ''}
                      onChange={setFlatId}
                    />
                  )}
                </View>
              ) : null}
            </View>
          ) : null}

          {error ? <Text className="mb-4 text-sm text-status-rejected">{error}</Text> : null}

          <Pressable
            className={`items-center rounded-bubbly bg-charcoal py-3.5 ${
              submitting || !resolved ? 'opacity-70' : ''
            }`}
            disabled={submitting || !resolved}
            onPress={() => void onJoin()}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-white">Request to join</Text>
            )}
          </Pressable>

          <Text className="mt-4 text-center text-xs text-ink-faint">
            An admin must approve your request before you can use the app
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
