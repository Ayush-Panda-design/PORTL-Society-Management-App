import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import { Menu } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { useThemePalette } from '@/hooks/use-theme';

/** Opens the parent drawer navigator from any nested screen. */
export function DrawerMenuButton() {
  const navigation = useNavigation();
  const palette = useThemePalette();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      className="h-11 w-11 items-center justify-center rounded-full bg-surface-card"
      style={{
        shadowColor: palette.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: palette.isDark ? 0.35 : 0.06,
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      <Menu color={palette.ink} size={20} strokeWidth={1.5} />
    </Pressable>
  );
}
