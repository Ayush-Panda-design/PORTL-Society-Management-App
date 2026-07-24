import { LinearGradient } from 'expo-linear-gradient';
import { ArrowUp, ChevronLeft, Mic, RotateCcw, Sparkles, Volume2 } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { AskPortlOrb } from '@/components/ask-portl/ask-portl-orb';
import { Brand, FontFamily, Gradients } from '@/constants/theme';
import { useAppBack } from '@/hooks/use-app-back';
import { useThemePalette } from '@/hooks/use-theme';
import { askPortl, toUserFriendlyAskPortlMessage, type AskPortlMessage } from '@/lib/ask-portl';
import { speakText, stopSpeaking } from '@/lib/speech';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types/database';

type Suggestion = { title: string; prompt: string };

const SUGGESTIONS_BY_ROLE: Record<UserRole, Suggestion[]> = {
  resident: [
    { title: 'Gym tomorrow', prompt: 'When is the gym available tomorrow?' },
    { title: 'Pending guests', prompt: 'Which visitors are waiting for my approval?' },
    { title: 'Urgent notices', prompt: 'Any urgent or pinned notices right now?' },
    { title: 'Open tickets', prompt: 'Status of my open helpdesk complaints' },
    { title: 'My bookings', prompt: 'What amenity bookings do I have coming up?' },
    { title: 'Society pulse', prompt: 'Give me a quick snapshot of my society today' },
  ],
  admin: [
    { title: 'Member count', prompt: 'How many members are in my society? Break down residents, admins, and guards.' },
    { title: 'Society pulse', prompt: 'Give me a quick ops snapshot of the society today' },
    { title: 'Open complaints', prompt: 'How many open helpdesk complaints are there, and any urgent ones?' },
    { title: 'Pending visitors', prompt: 'How many visitors are pending approval right now?' },
    { title: 'Join requests', prompt: 'Any pending join requests waiting for approval?' },
    { title: 'Towers & flats', prompt: 'How many towers and flats do we have?' },
  ],
  guard: [
    { title: 'Pending queue', prompt: 'Which visitors are pending approval right now?' },
    { title: 'Checked in', prompt: 'Who checked in at the gate in the last 6 hours?' },
    { title: 'Find a guest', prompt: 'Help me look up a visitor by name' },
    { title: 'Urgent notices', prompt: 'Any urgent or pinned notices for the gate?' },
    { title: 'Staff contacts', prompt: 'Show security or staff contacts I can call' },
    { title: 'How to check in', prompt: 'How do I verify and check in an approved visitor?' },
  ],
};

const BLURB_BY_ROLE: Record<UserRole, string> = {
  resident:
    'Ask about guests, amenities, notices, payments, staff, or helpdesk — Portl looks up live society data for you.',
  admin:
    'Your ops assistant — members, complaints, visitors, towers, payments, polls, and how-tos across Manage.',
  guard:
    'Gate desk assistant — pending queue, check-ins, notices, staff contacts, and entry how-tos.',
};

type Bubble = AskPortlMessage & { id: string };

function TypingDots({ color }: { color: string }) {
  return (
    <View className="flex-row items-center gap-1.5 px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <MotiView
          key={i}
          from={{ opacity: 0.35, translateY: 0 }}
          animate={{ opacity: 1, translateY: -3 }}
          transition={{
            type: 'timing',
            duration: 420,
            delay: i * 120,
            loop: true,
          }}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}

function ChatWallpaper({ isDark }: { isDark: boolean }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
      <LinearGradient
        colors={isDark ? [...Gradients.askPortlDark] : [...Gradients.askPortlLight]}
        locations={[0, 0.35, 0.7, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <LinearGradient
        colors={
          isDark
            ? ['rgba(225,29,72,0.16)', 'transparent', 'rgba(11,20,26,0.55)']
            : ['rgba(225,29,72,0.08)', 'transparent', 'rgba(247,247,248,0.4)']
        }
        locations={[0, 0.45, 1]}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '55%' }}
      />
      <LinearGradient
        colors={
          isDark
            ? ['transparent', 'rgba(31,44,52,0.35)', 'rgba(11,20,26,0.85)']
            : ['transparent', 'rgba(255,241,243,0.35)', 'rgba(247,247,248,0.9)']
        }
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '42%' }}
      />
      <LinearGradient
        colors={
          isDark
            ? ['rgba(134,150,160,0.04)', 'transparent', 'rgba(225,29,72,0.06)']
            : ['rgba(15,23,42,0.03)', 'transparent', 'rgba(225,29,72,0.05)']
        }
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
    </View>
  );
}

/** Shared Ask Portl chat — used by resident, admin, and guard routes. */
export function AskPortlChat() {
  const goBack = useAppBack();
  const role = (useAuthStore((s) => s.profile?.role) ?? 'resident') as UserRole;
  const { isDark, ink, inkMuted, card, muted, border, primaryAccent } = useThemePalette();
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speakReplies, setSpeakReplies] = useState(false);
  const [listening, setListening] = useState(false);
  const listRef = useRef<FlatList<Bubble>>(null);
  const inputRef = useRef<TextInput>(null);

  const suggestions = useMemo(
    () => SUGGESTIONS_BY_ROLE[role] ?? SUGGESTIONS_BY_ROLE.resident,
    [role],
  );
  const blurb = BLURB_BY_ROLE[role] ?? BLURB_BY_ROLE.resident;

  const speak = useCallback((text: string) => {
    void speakText(text).then((ok) => {
      if (!ok) {
        Toast.show({
          type: 'info',
          text1: 'Speech needs a rebuild',
          text2: 'Run npx expo run:android to enable spoken replies.',
        });
      }
    });
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      const userMsg: Bubble = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: trimmed,
      };
      const history = messages.map(({ role: r, content }) => ({ role: r, content }));
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setError(null);
      setSending(true);

      try {
        const answer = await askPortl(trimmed, history);
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: 'assistant', content: answer },
        ]);
        if (speakReplies) speak(answer);
        requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
      } catch (e) {
        const raw = e instanceof Error ? e.message : 'Ask Portl failed';
        setError(toUserFriendlyAskPortlMessage(raw));
      } finally {
        setSending(false);
      }
    },
    [messages, sending, speakReplies, speak],
  );

  const startVoice = useCallback(async () => {
    if (sending || listening) return;
    // Prefer device dictation: focus the field and guide the user.
    // Full STT needs a custom native module; keyboard mic works on all builds.
    setListening(true);
    inputRef.current?.focus();
    Toast.show({
      type: 'info',
      text1: 'Voice input',
      text2: 'Use your keyboard microphone, then tap Send — or enable Speak for replies.',
      visibilityTime: 3500,
    });
    setTimeout(() => setListening(false), 2500);
  }, [sending, listening]);

  const resetChat = () => {
    if (sending) return;
    void stopSpeaking();
    setMessages([]);
    setError(null);
    setInput('');
  };

  return (
    <SafeAreaView
      className="flex-1"
      edges={['top']}
      style={{ backgroundColor: isDark ? '#0B141A' : '#F7F7F8' }}
    >
      <View className="flex-1">
        <ChatWallpaper isDark={isDark} />

        <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={goBack}
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{
              backgroundColor: isDark ? 'rgba(31,44,52,0.9)' : 'rgba(255,255,255,0.92)',
              borderWidth: 1,
              borderColor: border,
            }}
          >
            <ChevronLeft color={ink} size={22} strokeWidth={1.75} />
          </Pressable>
          <View className="min-w-0 flex-1 flex-row items-center gap-3">
            <AskPortlOrb decorative compact size={40} />
            <View className="min-w-0 flex-1">
              <Text
                className="text-[18px] text-ink"
                style={{ fontFamily: FontFamily.display }}
                numberOfLines={1}
              >
                Ask Portl
              </Text>
              <Text className="text-[12px] text-ink-muted" style={{ fontFamily: FontFamily.body }}>
                {sending
                  ? 'Looking up your society…'
                  : role === 'admin'
                    ? 'Admin ops assistant'
                    : role === 'guard'
                      ? 'Gate desk assistant'
                      : 'Your society assistant'}
              </Text>
            </View>
          </View>
          {messages.length > 0 ? (
            <Pressable
              onPress={resetChat}
              accessibilityLabel="New chat"
              className="h-11 w-11 items-center justify-center rounded-full"
              style={{
                backgroundColor: isDark ? 'rgba(31,44,52,0.9)' : 'rgba(255,255,255,0.92)',
                borderWidth: 1,
                borderColor: border,
              }}
            >
              <RotateCcw color={inkMuted} size={18} strokeWidth={1.5} />
            </Pressable>
          ) : null}
        </View>

        <View className="flex-1">
          {messages.length === 0 ? (
            <View className="flex-1 px-5 pt-2">
              <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 420 }}
                style={{ marginBottom: 24, alignItems: 'center', paddingTop: 24 }}
              >
                <AskPortlOrb decorative compact size={72} />
                <Text
                  className="mt-5 text-center text-[26px] text-ink"
                  style={{ fontFamily: FontFamily.display }}
                >
                  How can I help?
                </Text>
                <Text
                  className="mt-2 max-w-[300px] text-center text-[14px] leading-5 text-ink-muted"
                  style={{ fontFamily: FontFamily.body }}
                >
                  {blurb}
                </Text>
              </MotiView>

              <Text
                className="mb-3 text-[11px] uppercase tracking-wider text-ink-muted"
                style={{ fontFamily: FontFamily.heading }}
              >
                Try asking
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {suggestions.map((s, i) => (
                  <MotiView
                    key={s.title}
                    from={{ opacity: 0, translateY: 6 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 320, delay: 80 + i * 40 }}
                  >
                    <Pressable
                      onPress={() => void send(s.prompt)}
                      disabled={sending}
                      className="rounded-pill px-3.5 py-2.5 active:opacity-85"
                      style={{
                        backgroundColor: isDark
                          ? 'rgba(31,44,52,0.88)'
                          : 'rgba(255,255,255,0.92)',
                        borderWidth: 1,
                        borderColor: border,
                      }}
                    >
                      <View className="flex-row items-center gap-1.5">
                        <Sparkles color={primaryAccent} size={13} strokeWidth={1.5} />
                        <Text
                          className="text-[13px] text-ink"
                          style={{ fontFamily: FontFamily.medium }}
                        >
                          {s.title}
                        </Text>
                      </View>
                    </Pressable>
                  </MotiView>
                ))}
              </View>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
              ListFooterComponent={
                sending ? (
                  <View className="mb-3 items-start">
                    <View
                      className="rounded-2xl px-4 py-3"
                      style={{
                        backgroundColor: isDark ? '#1F2C34' : card,
                        borderWidth: 1,
                        borderColor: border,
                        borderTopLeftRadius: 6,
                      }}
                    >
                      <TypingDots color={inkMuted} />
                    </View>
                  </View>
                ) : null
              }
              renderItem={({ item }) => {
                const mine = item.role === 'user';
                return (
                  <View className={`mb-3 ${mine ? 'items-end' : 'items-start'}`}>
                    {!mine ? (
                      <View className="mb-1.5 ml-1 flex-row items-center gap-1.5">
                        <Sparkles color={primaryAccent} size={12} strokeWidth={1.5} />
                        <Text
                          className="text-[11px] text-ink-muted"
                          style={{ fontFamily: FontFamily.heading }}
                        >
                          Portl
                        </Text>
                      </View>
                    ) : null}
                    <View
                      className="max-w-[88%] px-4 py-3"
                      style={{
                        backgroundColor: mine
                          ? Brand.primary
                          : isDark
                            ? '#1F2C34'
                            : '#FFFFFF',
                        borderRadius: 18,
                        borderTopRightRadius: mine ? 6 : 18,
                        borderTopLeftRadius: mine ? 18 : 6,
                        borderWidth: mine ? 0 : 1,
                        borderColor: border,
                      }}
                    >
                      <Text
                        className="text-[15px] leading-[22px]"
                        style={{
                          fontFamily: FontFamily.body,
                          color: mine ? '#FFFFFF' : ink,
                        }}
                      >
                        {item.content}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          )}

          <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
            {error ? (
              <View
                className="mx-3 mb-2 rounded-2xl px-3.5 py-2.5"
                style={{ backgroundColor: 'rgba(225,29,72,0.1)' }}
              >
                <Text
                  className="text-[13px] leading-5"
                  style={{ color: Brand.primaryMid, fontFamily: FontFamily.body }}
                >
                  {error}
                </Text>
              </View>
            ) : null}

            <View
              className="flex-row items-end gap-2 px-3 pb-2 pt-2"
              style={{
                backgroundColor: isDark ? 'rgba(11,20,26,0.92)' : 'rgba(247,247,248,0.96)',
                borderTopWidth: 1,
                borderTopColor: isDark ? 'rgba(42,57,66,0.7)' : 'rgba(232,232,234,0.9)',
              }}
            >
              <Pressable
                onPress={() => {
                  setSpeakReplies((v) => {
                    const next = !v;
                    Toast.show({
                      type: 'info',
                      text1: next ? 'Speak replies on' : 'Speak replies off',
                    });
                    if (!next) void stopSpeaking();
                    return next;
                  });
                }}
                accessibilityLabel="Toggle speak replies"
                className="h-12 w-12 items-center justify-center rounded-full"
                style={{
                  backgroundColor: speakReplies ? Brand.primary : isDark ? '#1F2C34' : muted,
                  borderWidth: 1,
                  borderColor: border,
                }}
              >
                <Volume2 color={speakReplies ? '#fff' : inkMuted} size={18} />
              </Pressable>
              <Pressable
                onPress={() => void startVoice()}
                accessibilityLabel="Voice input"
                className="h-12 w-12 items-center justify-center rounded-full"
                style={{
                  backgroundColor: listening ? Brand.primary : isDark ? '#1F2C34' : muted,
                  borderWidth: 1,
                  borderColor: border,
                }}
              >
                <Mic color={listening ? '#fff' : inkMuted} size={18} />
              </Pressable>
              <View
                className="max-h-28 min-h-[48px] flex-1 justify-center rounded-pill px-4 py-2"
                style={{
                  backgroundColor: isDark ? '#1F2C34' : muted,
                  borderWidth: 1,
                  borderColor: border,
                }}
              >
                <TextInput
                  ref={inputRef}
                  className="max-h-24 py-1 text-[15px] text-ink"
                  placeholder="Ask Portl anything…"
                  placeholderTextColor={inkMuted}
                  value={input}
                  onChangeText={setInput}
                  multiline
                  editable={!sending}
                  onSubmitEditing={() => void send(input)}
                  style={{ fontFamily: FontFamily.body }}
                />
              </View>
              <Pressable
                onPress={() => void send(input)}
                disabled={sending || !input.trim()}
                accessibilityLabel="Send"
                className="h-12 w-12 items-center justify-center rounded-full"
                style={{
                  backgroundColor: Brand.primary,
                  opacity: sending || !input.trim() ? 0.45 : 1,
                  shadowColor: Brand.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ArrowUp color="#fff" size={20} strokeWidth={2.2} />
                )}
              </Pressable>
            </View>
          </KeyboardStickyView>
        </View>
      </View>
    </SafeAreaView>
  );
}
