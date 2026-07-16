import { useRouter, type Href } from 'expo-router';
import {
  BarChart3,
  Building2,
  ClipboardList,
  Layers,
  Phone,
  Users,
} from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/stores/authStore';

const LINKS: {
  href: Href;
  title: string;
  subtitle: string;
  Icon: typeof Building2;
}[] = [
  {
    href: '/(admin)/towers' as Href,
    title: 'Towers',
    subtitle: 'Add and rename society buildings',
    Icon: Building2,
  },
  {
    href: '/(admin)/flats' as Href,
    title: 'Flats',
    subtitle: 'Map units to towers',
    Icon: Layers,
  },
  {
    href: '/(admin)/residents',
    title: 'Residents',
    subtitle: 'Assign members to flats',
    Icon: Users,
  },
  {
    href: '/(admin)/polls',
    title: 'Polls',
    subtitle: 'Create polls and view results',
    Icon: BarChart3,
  },
  {
    href: '/(admin)/complaints',
    title: 'Complaints',
    subtitle: 'Triage society helpdesk tickets',
    Icon: ClipboardList,
  },
  {
    href: '/(admin)/amenities',
    title: 'Amenities',
    subtitle: 'Manage facilities and slots',
    Icon: Building2,
  },
  {
    href: '/(admin)/staff',
    title: 'Staff directory',
    subtitle: 'Contacts residents can call',
    Icon: Phone,
  },
];

export default function AdminSettingsMore() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  const onSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 px-6 pt-8">
        <Text className="mb-1 text-3xl font-bold text-slate-900">Manage</Text>
        <Text className="mb-6 text-base text-slate-600">
          {profile?.full_name ?? 'Admin'} · society tools
        </Text>

        <View className="mb-6 gap-2">
          {LINKS.map(({ href, title, subtitle, Icon }) => (
            <Pressable
              key={title}
              onPress={() => router.push(href)}
              className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-teal-50">
                <Icon color="#0F766E" size={18} />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-slate-900">{title}</Text>
                <Text className="text-sm text-slate-500">{subtitle}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable
          className="items-center rounded-xl border border-red-200 bg-red-50 py-3.5"
          onPress={onSignOut}
        >
          <Text className="text-base font-semibold text-red-700">Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
