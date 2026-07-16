import {
  BarChart3,
  Building2,
  ClipboardList,
  Phone,
  Users,
} from 'lucide-react-native';

import { SettingsHub } from '@/components/ui/settings-hub';
import { useAuthStore } from '@/stores/authStore';

const LINKS = [
  {
    href: '/(resident)/polls' as const,
    title: 'Polls',
    subtitle: 'Vote on society questions',
    Icon: BarChart3,
  },
  {
    href: '/(resident)/helpdesk' as const,
    title: 'Helpdesk',
    subtitle: 'File and track complaints',
    Icon: ClipboardList,
  },
  {
    href: '/(resident)/amenities' as const,
    title: 'Amenities',
    subtitle: 'Book gym, clubhouse, and more',
    Icon: Building2,
  },
  {
    href: '/(resident)/directory' as const,
    title: 'Directory',
    subtitle: 'Staff & service contacts',
    Icon: Phone,
  },
  {
    href: '/(resident)/visitor-history' as const,
    title: 'Visitor history',
    subtitle: 'Past guests for your flat',
    Icon: Users,
  },
];

export default function ResidentMore() {
  const profile = useAuthStore((s) => s.profile);

  return (
    <SettingsHub
      title="More"
      subtitle={`${profile?.full_name ?? 'Resident'} · ${profile?.role ?? 'resident'}`}
      links={LINKS}
    />
  );
}
