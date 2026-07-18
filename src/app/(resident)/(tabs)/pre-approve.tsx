import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import { useState } from 'react';
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
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { QRCodeModal } from '@/components/visitors/qr-code-modal';
import { useThemePalette } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { VisitorType, VisitorWithFlat } from '@/types/database';
import { VISITOR_TYPES } from '@/types/database';

export default function PreApproveGuestScreen() {
  const router = useRouter();
  const palette = useThemePalette();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState('');
  const [type, setType] = useState<VisitorType>('guest');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [createdVisitor, setCreatedVisitor] = useState<VisitorWithFlat | null>(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);

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

    try {
      const { data, error: insertError } = await supabase.from('visitors').insert({
        name: name.trim(),
        phone: phone.trim() || null,
        photo_url: null,
        purpose: purpose.trim() || null,
        type,
        status: 'approved',
        flat_id: profile.flat_id,
        created_by: user.id,
        society_id: profile.society_id,
      }).select('*, flats(*)').single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      if (data) {
        setCreatedVisitor(data as VisitorWithFlat);
        setQrModalVisible(true);
      }
      
      setName('');
      setPhone('');
      setPurpose('');
      setType('guest');
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
          onPress={() => router.back()}
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

          <Text className="mb-2 text-sm font-medium text-ink-soft">Guest name</Text>
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
