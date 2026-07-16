import { ClipboardList, ScanLine, ShieldCheck, UserPlus } from 'lucide-react-native';

import { SettingsHub } from '@/components/ui/settings-hub';
import { useAuthStore } from '@/stores/authStore';

const LINKS = [
  {
    href: '/(guard)/dashboard' as const,
    title: 'Pending queue',
    subtitle: 'Visitors awaiting resident approval',
    Icon: ShieldCheck,
  },
  {
    href: '/(guard)/register-visitor' as const,
    title: 'Register visitor',
    subtitle: 'Create a new gate request',
    Icon: UserPlus,
  },
  {
    href: '/(guard)/verify' as const,
    title: 'Entry & verify',
    subtitle: 'Check in approved visitors',
    Icon: ScanLine,
  },
  {
    href: '/(guard)/logs' as const,
    title: 'Visitor logs',
    subtitle: 'Entry and exit history',
    Icon: ClipboardList,
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
