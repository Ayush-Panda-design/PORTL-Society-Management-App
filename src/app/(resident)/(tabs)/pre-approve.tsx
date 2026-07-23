import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Contact, Zap } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { ChipSelector } from '@/components/ui/chip-selector';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { QRCodeModal } from '@/components/visitors/qr-code-modal';
import { useAppBack } from '@/hooks/use-app-back';
import { useThemePalette } from '@/hooks/use-theme';
import { pickContact } from '@/lib/contacts-picker';
import {
  fetchFrequentVisitors,
  quickApproveFrequentVisitor,
  upsertFrequentVisitor,
} from '@/lib/ops-api';
import { queryKeys } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { VisitorType, VisitorWithFlat } from '@/types/database';
import { VISITOR_TYPES } from '@/types/database';

export default function PreApproveGuestScreen() {
  const goBack = useAppBack();
  const palette = useThemePalette();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState('');
  const [type, setType] = useState<VisitorType>('guest');
  const [validity, setValidity] = useState<'today' | '24h' | 'week'>('today');
  const [saveAsFrequent, setSaveAsFrequent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createdVisitor, setCreatedVisitor] = useState<VisitorWithFlat | null>(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);

  const frequentQuery = useQuery({
    queryKey: queryKeys.frequentVisitors(profile?.flat_id ?? 'none'),
    queryFn: () => fetchFrequentVisitors(profile!.flat_id!),
    enabled: Boolean(profile?.flat_id),
  });

  const quickApproveMutation = useMutation({
    mutationFn: (id: string) => quickApproveFrequentVisitor(id, 12),
    onSuccess: async (visitor) => {
      setCreatedVisitor(visitor as VisitorWithFlat);
      setQrModalVisible(true);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.frequentVisitors(profile!.flat_id!),
      });
    },
    onError: (e: Error) => setError(e.message),
  });

  const onSubmit = async () => {
    setError(null);
    setCreatedVisitor(null);

    if (!profile?.flat_id || !profile.society_id || !user) {
      setError('Your profile must be linked to a flat and society.');
      return;
    }
    if (!name.trim()) {
      setError('Guest name is required.');
      return;
    }

    setSubmitting(true);

    const expires_at = new Date();
    if (validity === 'today') {
      expires_at.setHours(23, 59, 59, 999);
    } else if (validity === '24h') {
      expires_at.setHours(expires_at.getHours() + 24);
    } else if (validity === 'week') {
      expires_at.setDate(expires_at.getDate() + 7);
    }

    try {
      const { data, error: insertError } = await supabase
        .from('visitors')
        .insert({
          name: name.trim(),
          phone: phone.trim() || null,
          photo_url: null,
          purpose: purpose.trim() || null,
          type,
          status: 'approved',
          flat_id: profile.flat_id,
          created_by: user.id,
          society_id: profile.society_id,
          expires_at: expires_at.toISOString(),
        })
        .select('*, flats(*)')
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      if (saveAsFrequent) {
        await upsertFrequentVisitor({
          societyId: profile.society_id,
          flatId: profile.flat_id,
          name: name.trim(),
          phone: phone.trim() || null,
          type,
          purpose: purpose.trim() || null,
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.frequentVisitors(profile.flat_id),
        });
      }

      if (data) {
        setCreatedVisitor(data as VisitorWithFlat);
        setQrModalVisible(true);
      }

      setName('');
      setPhone('');
      setPurpose('');
      setType('guest');
      setSaveAsFrequent(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to pre-approve guest');
    } finally {
      setSubmitting(false);
    }
  };

  if (!profile?.flat_id || !profile.society_id) {
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <EmptyState
          title="Flat not linked"
          subtitle="You need a flat and society on your profile to pre-approve guests."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center gap-3 px-4 pb-2 pt-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => goBack()}
          className="h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-card"
        >
          <ArrowLeft color={palette.inkMuted} size={18} />
        </Pressable>
        <View>
          <Text className="text-2xl font-bold text-ink">Pre-approve guest</Text>
          <Text className="text-sm text-ink-muted">Skips gate approval wait</Text>
        </View>
      </View>

      <KeyboardAwareScrollView
        bottomOffset={32}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        {error ? <ErrorBanner message={error} /> : null}

        {createdVisitor ? (
          <Pressable
            onPress={() => setQrModalVisible(true)}
            className="mb-6 flex-row items-center justify-between rounded-2xl border border-brand-100 bg-brand-50 p-4"
          >
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-100">
                <CheckCircle2 color="#2D6A5A" size={20} />
              </View>
              <View>
                <Text className="font-semibold text-ink">Guest Pre-approved!</Text>
                <Text className="text-sm text-ink-muted">Tap to view QR Pass</Text>
              </View>
            </View>
          </Pressable>
        ) : null}

        {(frequentQuery.data?.length ?? 0) > 0 ? (
          <View className="mb-6">
            <Text className="mb-2 text-sm font-medium text-ink-soft">Frequent visitors</Text>
            <View className="gap-2">
              {frequentQuery.data!.map((fv) => (
                <Pressable
                  key={fv.id}
                  disabled={quickApproveMutation.isPending}
                  onPress={() => quickApproveMutation.mutate(fv.id)}
                  className="flex-row items-center justify-between rounded-xl border border-surface-border bg-surface-card px-4 py-3"
                >
                  <View className="min-w-0 flex-1 pr-3">
                    <Text className="font-semibold text-ink">{fv.name}</Text>
                    <Text className="text-xs text-ink-muted">
                      {fv.type} · {fv.visit_count} visits
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Zap color="#C4861A" size={14} />
                    <Text className="text-sm font-semibold text-brand-700">Quick approve</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-sm font-medium text-ink-soft">Guest name</Text>
          <Pressable
            onPress={async () => {
              try {
                const contact = await pickContact();
                if (!contact) return;
                setName(contact.name);
                if (contact.phone) setPhone(contact.phone);
              } catch (e) {
                Toast.show({
                  type: 'error',
                  text1: 'Could not open contacts',
                  text2: e instanceof Error ? e.message : undefined,
                });
              }
            }}
            className="flex-row items-center gap-1 rounded-pill px-2.5 py-1"
            style={{ backgroundColor: '#E8F5F1' }}
          >
            <Contact color="#0F766E" size={14} />
            <Text className="text-xs font-semibold text-brand-700">From contacts</Text>
          </Pressable>
        </View>
        <TextInput
          className="mb-4 rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
          placeholder="Alex Rivera"
          placeholderTextColor="#94A3B8"
          value={name}
          onChangeText={setName}
        />

        <Text className="mb-2 text-sm font-medium text-ink-soft">Phone</Text>
        <TextInput
          className="mb-4 rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
          placeholder="Optional"
          placeholderTextColor="#94A3B8"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        <Text className="mb-2 text-sm font-medium text-ink-soft">Purpose</Text>
        <TextInput
          className="mb-4 rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-base text-ink"
          placeholder="Dinner, overnight stay…"
          placeholderTextColor="#94A3B8"
          value={purpose}
          onChangeText={setPurpose}
        />

        <Text className="mb-2 text-sm font-medium text-ink-soft">Type</Text>
        <ChipSelector
          className="mb-6"
          presentation="tiles"
          options={VISITOR_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          value={type}
          onChange={setType}
        />

        <Text className="mb-2 text-sm font-medium text-ink-soft">Validity</Text>
        <ChipSelector
          className="mb-4"
          presentation="tiles"
          options={[
            { value: 'today', label: 'Today only' },
            { value: '24h', label: 'Next 24h' },
            { value: 'week', label: 'This week' },
          ]}
          value={validity}
          onChange={(v) => setValidity(v as 'today' | '24h' | 'week')}
        />

        <View className="mb-6 flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-sm font-medium text-ink">Save as frequent visitor</Text>
            <Text className="text-xs text-ink-muted">Cook, driver, or regular help</Text>
          </View>
          <Switch value={saveAsFrequent} onValueChange={setSaveAsFrequent} />
        </View>

        <Pressable
          disabled={submitting}
          onPress={onSubmit}
          className={`items-center rounded-bubbly bg-charcoal py-3.5 ${
            submitting ? 'opacity-70' : ''
          }`}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">Pre-approve</Text>
          )}
        </Pressable>
      </KeyboardAwareScrollView>

      <QRCodeModal
        visible={qrModalVisible}
        onClose={() => setQrModalVisible(false)}
        visitor={createdVisitor}
      />
    </SafeAreaView>
  );
}
