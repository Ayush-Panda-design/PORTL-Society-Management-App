import { Search, X } from 'lucide-react-native';
import { Pressable, TextInput, View } from 'react-native';

import { FontFamily } from '@/constants/theme';
import { useThemePalette } from '@/hooks/use-theme';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
};

/** WhatsApp/Instagram-style search field for long lists. */
export function SearchField({
  value,
  onChangeText,
  placeholder = 'Search',
  accessibilityLabel = 'Search',
}: Props) {
  const palette = useThemePalette();

  return (
    <View className="mb-3 flex-row items-center gap-2 rounded-full border-0 bg-surface-muted/50 px-4 py-3">
      <Search color={palette.inkMuted} size={20} accessibilityElementsHidden />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        className="min-h-[22px] flex-1 text-base text-ink"
        style={{ fontFamily: FontFamily.body, padding: 0 }}
        placeholder={placeholder}
        placeholderTextColor={palette.inkFaint}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="never"
        returnKeyType="search"
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={8}
          onPress={() => onChangeText('')}
          className="h-7 w-7 items-center justify-center rounded-full bg-surface-muted"
        >
          <X color={palette.inkMuted} size={14} />
        </Pressable>
      ) : null}
    </View>
  );
}
