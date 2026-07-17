import { ClipboardList, ScanLine, ShieldCheck, UserPlus } from 'lucide-react-native';
import { type Href } from 'expo-router';

import { SettingsHub, type SettingsLink } from '@/components/ui/settings-hub';
import { useAuthStore } from '@/stores/authStore';
import { Brand } from '@/constants/theme';

const LINKS: SettingsLink[] = [
  {
    href: '/(guard)/dashboard' as Href,
    title: 'Pending queue',
    subtitle: 'Visitors awaiting resident approval',
    Icon: ShieldCheck,
    tone: 'rose',
    iconColor: '#C0392B',
  },
  {
    href: '/(guard)/register-visitor' as Href,
    title: 'Register visitor',
    subtitle: 'Create a new gate request',
    Icon: UserPlus,
    tone: 'mint',
    iconColor: Brand.primary,
  },
  {
    href: '/(guard)/verify' as Href,
    title: 'Entry & verify',
    subtitle: 'Check in approved visitors',
    Icon: ScanLine,
    tone: 'sky',
    iconColor: '#2563EB',
  },
  {
    href: '/(guard)/logs' as Href,
    title: 'Visitor logs',
    subtitle: 'Entry and exit history',
    Icon: ClipboardList,
    tone: 'butter',
    iconColor: '#C4861A',
  },
];

export default function GuardMore() {
  const profile = useAuthStore((s) => s.profile);

  return (
    <SettingsHub
      title="More"
      subtitle={`${profile?.full_name ?? 'Guard'} · gate desk tools`}
      links={LINKS}
    />
  );
}
