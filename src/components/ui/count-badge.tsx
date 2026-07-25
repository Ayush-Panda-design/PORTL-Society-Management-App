import { Text, View } from 'react-native';

import { Brand } from '@/constants/theme';

/** Shared red count pill — matches notices tab badges. */
export function CountBadge({
  count,
  size = 'md',
}: {
  count: number;
  size?: 'sm' | 'md';
}) {
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  const isSm = size === 'sm';

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        minWidth: isSm ? 16 : 18,
        height: isSm ? 16 : 18,
        paddingHorizontal: isSm ? 4 : 5,
        borderRadius: 9,
        backgroundColor: Brand.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: '#FFFFFF',
          fontSize: isSm ? 9 : 10,
          fontWeight: '700',
          lineHeight: isSm ? 11 : 12,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
