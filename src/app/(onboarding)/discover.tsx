import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Search } from 'lucide-react-native';

import { ChipSelector } from '@/components/ui/chip-selector';
import { Brand, FontFamily, Gradients } from '@/constants/theme';
import { inviteErrorKind } from '@/lib/invite-errors';
import {
  getSocietyFlats,
  requestJoinSociety,
  searchSocieties,
} from '@/lib/society-api';
import { useAuthStore } from '@/stores/authStore';
import type { DiscoverableSociety, InviteFlatOption, InviteRole } from '@/types/database';

export default function DiscoverSocietyScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DiscoverableSociety[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<DiscoverableSociety | null>(null);
  const [flats, setFlats] = useState<InviteFlatOption[]>([]);
  const [flatId, setFlatId] = useState('');
  const [role, setRole] = useState<InviteRole>('resident');
  const [loadingFlats, setLoadingFlats] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<ReturnType<typeof inviteErrorKind>>('other');

  const flatOptions = useMemo(
    () =>
      flats.map((f) => ({
        value: f.id,
        label: `${f.tower_name} · ${f.number}`,
      })),
    [flats],
  );

  const runSearch = useCallback(async (q: string) => {
    setSearching(true);
    setError(null);
    try {
      const hits = await searchSocieties(q);
      setResults(hits);
      setSearched(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not search societies';
      setError(msg);
      setErrorKind(inviteErrorKind(msg));
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void runSearch(query);
    }, 350);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  const onSelect = async (society: DiscoverableSociety) => {
    setSelected(society);
    setError(null);
    setFlatId('');
    setRole('resident');
    setFlats([]);
    if (!society.has_flats) {
      setError(
        'This society has no flats yet. Ask the admin to add towers and flats, or join with an invite code later.',
      );
      return;
    }
    setLoadingFlats(true);
    try {
      const list = await getSocietyFlats(society.id);
      setFlats(list);
      if (list[0]) setFlatId(list[0].id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not load flats';
      setError(msg);
      setErrorKind(inviteErrorKind(msg));
    } finally {
      setLoadingFlats(false);
    }
  };

  const onRequest = async () => {
    setError(null);
    if (!selected) {
      setError('Select a society from the search results');
      return;
    }
    if (role === 'resident') {
      if (!flatId) {
        setError('Select your flat');
        return;
      }
      if (flats.length === 0) {
        setError('This society has no flats yet. Ask the admin to set them up first.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const effectiveFlatId =
        role === 'resident' ? flatId || flatOptions[0]?.value || null : null;

      await requestJoinSociety({
        societyId: selected.id,
        role,
        flatId: effectiveFlatId,
      });
      if (user?.id) {
        const profile = await fetchProfile(user.id);
        if (!profile?.society_id || profile.status !== 'pending') {
          throw new Error(
            'Join request was not saved. Try again, or join with an invite code.',
          );
        }
      }
      router.replace('/(onboarding)/pending');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not request to join';
      setError(msg);
      setErrorKind(inviteErrorKind(msg));
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
                Find your society
              </Text>
              <Text className="text-sm text-white/85">
                Search by name, city, or area — no invite code needed
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View className="-mt-4 flex-1 rounded-t-3xl bg-surface px-6 pb-10 pt-7">
          <View className="mb-4 flex-row items-center gap-2 rounded-xl border border-surface-border bg-surface-card px-3 py-2.5">
            <Search color={Brand.inkMuted} size={18} />
            <TextInput
              className="min-w-0 flex-1 text-base text-ink"
              placeholder="e.g. Sunrise Heights, Koregaon Park"
              placeholderTextColor="#94A3B8"
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              returnKeyType="search"
            />
            {searching ? <ActivityIndicator color={Brand.primary} /> : null}
          </View>

          {!selected ? (
            <View className="mb-4">
              {searched && results.length === 0 && !searching ? (
                <View className="rounded-2xl border border-dashed border-surface-border px-4 py-6">
                  <Text className="text-center text-sm text-ink-muted">
                    No societies match that search. Try another name or city, create a society if
                    you’re the admin, or join with an invite code.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={results}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View className="h-2.5" />}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => void onSelect(item)}
                      className="rounded-2xl border border-surface-border bg-surface-card px-4 py-3.5"
                    >
                      <Text
                        className="text-base text-ink"
                        style={{ fontFamily: FontFamily.heading }}
                      >
                        {item.name}
                      </Text>
                      <View className="mt-1.5 flex-row items-start gap-1.5">
                        <MapPin color={Brand.inkMuted} size={14} style={{ marginTop: 2 }} />
                        <Text className="min-w-0 flex-1 text-sm text-ink-muted">
                          {[item.area, item.city].filter(Boolean).join(', ') || item.address}
                        </Text>
                      </View>
                      <Text className="mt-1 text-xs text-ink-faint">
                        {item.member_count} member{item.member_count === 1 ? '' : 's'}
                        {!item.has_flats ? ' · flats not set up yet' : ''}
                      </Text>
                    </Pressable>
                  )}
                />
              )}
            </View>
          ) : (
            <View className="mb-5 rounded-2xl border border-surface-border bg-surface-card p-4">
              <Pressable onPress={() => setSelected(null)} className="mb-2 self-start">
                <Text className="text-sm font-semibold text-brand-800">Change society</Text>
              </Pressable>
              <Text className="text-lg text-ink" style={{ fontFamily: FontFamily.heading }}>
                {selected.name}
              </Text>
              <Text className="mt-1 text-sm text-ink-muted">{selected.address}</Text>

              <Text className="mb-2 mt-4 text-sm font-medium text-ink-soft">Joining as</Text>
              <View className="mb-3 flex-row gap-2">
                {(['resident', 'guard'] as InviteRole[]).map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setRole(r)}
                    className={`rounded-full px-4 py-2 ${
                      role === r ? 'bg-charcoal' : 'bg-surface border border-surface-border'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        role === r ? 'text-white' : 'text-ink-muted'
                      }`}
                    >
                      {r === 'resident' ? 'Resident' : 'Guard'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {role === 'resident' ? (
                <View className="mt-1">
                  <Text className="mb-2 text-sm font-medium text-ink-soft">Your flat</Text>
                  {loadingFlats ? (
                    <ActivityIndicator color={Brand.primary} />
                  ) : flatOptions.length === 0 ? (
                    <Text className="text-sm text-status-rejected">
                      No flats configured yet. Ask the admin to add towers and flats.
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
          )}

          {error ? (
            <View
              className={`mb-4 rounded-2xl px-4 py-3 ${
                errorKind === 'already_member' || errorKind === 'pending'
                  ? 'bg-pastel-peach/40'
                  : 'bg-red-50'
              }`}
            >
              <Text className="text-sm font-semibold text-ink">
                {errorKind === 'expired'
                  ? 'Invite expired'
                  : errorKind === 'already_member'
                    ? 'Already a member'
                    : errorKind === 'pending'
                      ? 'Request pending'
                      : errorKind === 'invalid'
                        ? 'Not found'
                        : 'Couldn’t join'}
              </Text>
              <Text className="mt-1 text-sm text-status-rejected">{error}</Text>
            </View>
          ) : null}

          <Pressable
            className={`items-center rounded-bubbly bg-charcoal py-3.5 ${
              submitting || !selected ? 'opacity-70' : ''
            }`}
            disabled={submitting || !selected}
            onPress={() => void onRequest()}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-white">Request to join</Text>
            )}
          </Pressable>

          <Text className="mt-4 text-center text-xs text-ink-faint">
            An admin must approve your request. Prefer a code?{' '}
            <Text
              className="font-semibold text-brand-800"
              onPress={() => router.push('/(onboarding)/join')}
            >
              Join with invite
            </Text>
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
