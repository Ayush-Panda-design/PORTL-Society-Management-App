import { Plus, Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PollCustomExpiryPicker } from '@/components/polls/poll-custom-expiry-picker';
import { ChipSelector } from '@/components/ui/chip-selector';
import { Brand, FontFamily } from '@/constants/theme';
import {
  POLL_TEMPLATES,
  type PollDurationPreset,
  type PollTemplateId,
  defaultCustomExpiryDate,
  describePollExpiry,
  isDatePickerNativeAvailable,
  pollDurationOptions,
  validatePollForm,
} from '@/lib/poll-form';

type Props = {
  onSubmit: (input: { question: string; options: string[]; expiresAt: string | null }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  error: string | null;
};

export function PollCreateForm({ onSubmit, onCancel, isSubmitting, error }: Props) {
  const [template, setTemplate] = useState<PollTemplateId>('yes_no');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['Yes', 'No']);
  const [duration, setDuration] = useState<PollDurationPreset>('3d');
  const [customExpiry, setCustomExpiry] = useState(defaultCustomExpiryDate);
  const [localError, setLocalError] = useState<string | null>(null);

  const durationOptions = useMemo(() => pollDurationOptions(), []);
  const canPickCustomDate = isDatePickerNativeAvailable();

  useEffect(() => {
    if (!canPickCustomDate && duration === 'custom') {
      setDuration('3d');
    }
  }, [canPickCustomDate, duration]);

  const activeTemplate = useMemo(
    () => POLL_TEMPLATES.find((t) => t.value === template) ?? POLL_TEMPLATES[0],
    [template],
  );

  const expiryHint = useMemo(
    () => describePollExpiry(duration, customExpiry),
    [duration, customExpiry],
  );

  const applyTemplate = (next: PollTemplateId) => {
    const picked = POLL_TEMPLATES.find((t) => t.value === next);
    if (!picked) return;
    setTemplate(next);
    if (next !== 'custom') {
      setOptions([...picked.options]);
    } else if (options.every((o) => !o.trim())) {
      setOptions(['', '']);
    }
  };

  const handleSubmit = () => {
    setLocalError(null);
    try {
      const payload = validatePollForm({
        question,
        options,
        duration,
        customExpiry: duration === 'custom' ? customExpiry : undefined,
      });
      onSubmit(payload);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Could not create poll.');
    }
  };

  const displayError = localError ?? error;

  return (
    <View className="max-h-[92%] rounded-t-3xl bg-surface-card pt-5">
      <View className="mb-3 items-center px-5">
        <View className="mb-3 h-1 w-10 rounded-full bg-slate-200" />
        <Text className="self-start text-xl text-slate-900" style={{ fontFamily: FontFamily.display }}>
          New poll
        </Text>
        <Text className="mt-1 self-start text-sm text-slate-500" style={{ fontFamily: FontFamily.body }}>
          Pick a template, set how long it runs, and publish.
        </Text>
      </View>

      <ScrollView
        className="px-5"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        {displayError ? (
          <Text className="mb-3 text-sm text-red-600" style={{ fontFamily: FontFamily.medium }}>
            {displayError}
          </Text>
        ) : null}

        <Text className="mb-2 text-sm text-slate-700" style={{ fontFamily: FontFamily.heading }}>
          Quick template
        </Text>
        <ChipSelector
          options={POLL_TEMPLATES.map((t) => ({ value: t.value, label: t.label }))}
          value={template}
          onChange={applyTemplate}
          presentation="filter"
          className="mb-4"
        />

        <Text className="mb-2 text-sm text-slate-700" style={{ fontFamily: FontFamily.heading }}>
          Question
        </Text>
        <TextInput
          className="mb-4 rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900"
          placeholder={activeTemplate.placeholder}
          placeholderTextColor="#94A3B8"
          value={question}
          onChangeText={setQuestion}
          multiline
          style={{ fontFamily: FontFamily.body, minHeight: 52, textAlignVertical: 'top' }}
        />

        <Text className="mb-2 text-sm text-slate-700" style={{ fontFamily: FontFamily.heading }}>
          Options
        </Text>
        {options.map((opt, index) => (
          <View key={index} className="mb-2 flex-row items-center gap-2">
            <TextInput
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900"
              placeholder={`Option ${index + 1}`}
              placeholderTextColor="#94A3B8"
              value={opt}
              onChangeText={(text) => {
                const next = [...options];
                next[index] = text;
                setOptions(next);
              }}
              style={{ fontFamily: FontFamily.body }}
            />
            {options.length > 2 ? (
              <Pressable
                onPress={() => setOptions(options.filter((_, i) => i !== index))}
                className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
              >
                <Trash2 color="#64748B" size={16} />
              </Pressable>
            ) : null}
          </View>
        ))}

        <Pressable
          onPress={() => setOptions((prev) => [...prev, ''])}
          className="mb-4 flex-row items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2.5"
        >
          <Plus color={Brand.primary} size={16} />
          <Text className="font-semibold text-brand-700" style={{ fontFamily: FontFamily.heading }}>
            Add option
          </Text>
        </Pressable>

        <Text className="mb-2 text-sm text-slate-700" style={{ fontFamily: FontFamily.heading }}>
          How long should it run?
        </Text>
        <ChipSelector
          options={durationOptions}
          value={duration}
          onChange={setDuration}
          presentation="filter"
          className="mb-2"
        />
        <Text className="mb-3 text-sm text-slate-500" style={{ fontFamily: FontFamily.body }}>
          {expiryHint}
        </Text>

        {duration === 'custom' && canPickCustomDate ? (
          <View className="mb-2">
            <PollCustomExpiryPicker value={customExpiry} onChange={setCustomExpiry} />
          </View>
        ) : null}
      </ScrollView>

      <View className="flex-row gap-2 border-t border-slate-100 px-5 pb-10 pt-4">
        <Pressable
          onPress={onCancel}
          disabled={isSubmitting}
          className="flex-1 items-center rounded-xl border border-slate-200 py-3"
        >
          <Text className="font-semibold text-slate-700" style={{ fontFamily: FontFamily.heading }}>
            Cancel
          </Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 items-center rounded-xl bg-charcoal py-3"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-semibold text-white" style={{ fontFamily: FontFamily.heading }}>
              Create poll
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
