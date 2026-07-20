import { Drawer } from 'expo-router/drawer';

import { AppDrawerContent } from '@/components/navigation/app-drawer-content';
import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import { Brand } from '@/constants/theme';

export default function AdminDrawerLayout() {
  const scheme = useResolvedColorScheme();
  const isDark = scheme === 'dark';

  return (
    <Drawer
      backBehavior="history"
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        overlayColor: 'rgba(16, 21, 18, 0.45)',
        drawerStyle: {
          width: 300,
          backgroundColor: isDark ? '#1A1F1D' : Brand.surface,
        },
      }}
    >
      <Drawer.Screen name="(tabs)" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="profile" options={{ drawerItemStyle: { display: 'none' } }} />
    </Drawer>
  );
}
