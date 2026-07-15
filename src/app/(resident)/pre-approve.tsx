import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { VisitorType } from '@/types/database';
import { VISITOR_TYPES } from '@/types/database';

export default function PreApproveGuestScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState('');
  const [type, setType] = useState<VisitorType>('guest');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setSuccess(null);

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
      const { error: insertError } = await supabase.from('visitors').insert({
        name: name.trim(),
        phone: phone.trim() || null,
        photo_url: null,
        purpose: purpose.trim() || null,
        type,
        status: 'approved',
        flat_id: profile.flat_id,
        created_by: user.id,
        society_id: profile.society_id,
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setSuccess(`${name.trim()} is pre-approved. The guard will see them ready for entry.`);
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
      <SafeAreaView className="flex-1 bg-slate-50">
        <EmptyState
          title="Flat not linked"
          subtitle="You need a flat and society on your profile to pre-approve guests."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-row items-center gap-3 px-4 pb-2 pt-3">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white"
          >
            <ArrowLeft color="#475569" size={18} />
          </Pressable>
          <View>
            <Text className="text-2xl font-bold text-slate-900">Pre-approve guest</Text>
            <Text className="text-sm text-slate-500">Skips gate approval wait</Text>
          </View>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        >
          {error ? <ErrorBanner message={error} /> : null}
          {success ? (
            <View className="mb-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">
              <Text className="text-sm text-teal-800">{success}</Text>
            </View>
          ) : null}

          <Text className="mb-2 text-sm font-medium text-slate-700">Guest name</Text>
          <TextInput
            className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
            placeholder="Alex Rivera"
            placeholderTextColor="#94A3B8"
            value={name}
            onChangeText={setName}
          />

          <Text className="mb-2 text-sm font-medium text-slate-700">Phone</Text>
          <TextInput
            className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
            placeholder="Optional"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Text className="mb-2 text-sm font-medium text-slate-700">Purpose</Text>
          <TextInput
            className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
            placeholder="Dinner, overnight stay…"
            placeholderTextColor="#94A3B8"
            value={purpose}
            onChangeText={setPurpose}
          />

          <Text className="mb-2 text-sm font-medium text-slate-700">Type</Text>
          <View className="mb-6 flex-row flex-wrap gap-2">
            {VISITOR_TYPES.map((item) => {
              const selected = type === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setType(item.value)}
                  className={`rounded-full border px-3.5 py-2 ${
                    selected
                      ? 'border-teal-700 bg-teal-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      selected ? 'text-teal-800' : 'text-slate-700'
                    }`}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            disabled={submitting}
            onPress={onSubmit}
            className={`items-center rounded-xl bg-teal-700 py-3.5 ${
              submitting ? 'opacity-70' : ''
            }`}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-white">Pre-approve</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
