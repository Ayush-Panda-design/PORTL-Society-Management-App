import { ClipboardList, ScanLine, ShieldCheck, User, UserPlus } from 'lucide-react-native';
import { type Href } from 'expo-router';

import { SettingsHub, type SettingsLink } from '@/components/ui/settings-hub';
import { useAuthStore } from '@/stores/authStore';

const SECTIONS: { title: string; links: SettingsLink[] }[] = [
  {
    title: 'Account',
    links: [
      {
        href: '/(guard)/profile' as Href,
        title: 'My profile',
        subtitle: 'Bio, personal details, and private notes',
        Icon: User,
      },
    ],
  },
  {
    title: 'Gate',
    links: [
      {
        href: '/(guard)/dashboard' as Href,
        title: 'Pending queue',
        subtitle: 'Visitors awaiting resident approval',
        Icon: ShieldCheck,
      },
      {
        href: '/(guard)/register-visitor' as Href,
        title: 'Register visitor',
        subtitle: 'Create a new gate request',
        Icon: UserPlus,
      },
      {
        href: '/(guard)/verify' as Href,
        title: 'Entry & verify',
        subtitle: 'Check in approved visitors',
        Icon: ScanLine,
      },
      {
        href: '/(guard)/logs' as Href,
        title: 'Visitor logs',
        subtitle: 'Entry and exit history',
        Icon: ClipboardList,
      },
    ],
  },
];

export default function GuardMore() {
  const profile = useAuthStore((s) => s.profile);

  return (
    <SettingsHub
      title="More"
      subtitle={`${profile?.full_name ?? 'Guard'} · gate desk tools`}
      links={[]}
      sections={SECTIONS}
    />
  );
}
