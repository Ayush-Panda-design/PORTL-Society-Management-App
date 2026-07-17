import { Stack } from 'expo-router';

import { useThemePalette } from '@/hooks/use-theme';

export default function OnboardingLayout() {
  const { surface } = useThemePalette();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: surface },
      }}
    />
  );
}
