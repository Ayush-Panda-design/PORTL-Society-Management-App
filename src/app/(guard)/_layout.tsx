import { Drawer } from 'expo-router/drawer';

import { RoleGate } from '@/components/auth/role-gate';
import { AppDrawerContent } from '@/components/navigation/app-drawer-content';
import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import { getPalette } from '@/constants/theme';

export default function GuardDrawerLayout() {
  const scheme = useResolvedColorScheme();
  const palette = getPalette(scheme);

  return (
    <RoleGate allowedRole="guard">
      <Drawer
        backBehavior="history"
        drawerContent={(props) => <AppDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerType: 'front',
          overlayColor: scheme === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(16, 21, 18, 0.45)',
          drawerStyle: {
            width: 300,
            backgroundColor: palette.card,
          },
        }}
      >
        <Drawer.Screen name="(tabs)" options={{ drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="profile" options={{ drawerItemStyle: { display: 'none' } }} />
      </Drawer>
    </RoleGate>
  );
}
