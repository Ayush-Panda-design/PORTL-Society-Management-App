import {
  BarChart3,
  Building2,
  ClipboardList,
  Phone,
  Receipt,
  User,
  Users,
} from 'lucide-react-native';
import { type Href } from 'expo-router';

import { SettingsHub, type SettingsLink } from '@/components/ui/settings-hub';
import { useAuthStore } from '@/stores/authStore';

const SECTIONS: { title: string; links: SettingsLink[] }[] = [
  {
    title: 'Account',
    links: [
      {
        href: '/(resident)/profile' as Href,
        title: 'My profile',
        subtitle: 'Bio, personal details, and private notes',
        Icon: User,
      },
    ],
  },
  {
    title: 'Society',
    links: [
      {
        href: '/(resident)/polls' as Href,
        title: 'Polls',
        subtitle: 'Vote on society questions',
        Icon: BarChart3,
      },
      {
        href: '/(resident)/helpdesk' as Href,
        title: 'Helpdesk',
        subtitle: 'File and track complaints',
        Icon: ClipboardList,
      },
      {
        href: '/(resident)/amenities' as Href,
        title: 'Amenities',
        subtitle: 'Book gym, clubhouse, and more',
        Icon: Building2,
      },
      {
        href: '/(resident)/payments' as Href,
        title: 'Payments',
        subtitle: 'Ledger, dues, and statement',
        Icon: Receipt,
      },
      {
        href: '/(resident)/directory' as Href,
        title: 'Directory',
        subtitle: 'Staff & service contacts',
        Icon: Phone,
      },
      {
        href: '/(resident)/visitor-history' as Href,
        title: 'Visitor history',
        subtitle: 'Past guests for your flat',
        Icon: Users,
      },
    ],
  },
];

export default function ResidentMore() {
  const profile = useAuthStore((s) => s.profile);
  const roleLabel =
    profile?.role === 'admin'
      ? 'admin'
      : profile?.role === 'guard'
        ? 'security'
        : 'resident';

  return (
    <SettingsHub
      title="More"
      subtitle={`${profile?.full_name ?? 'Resident'} · ${roleLabel}`}
      links={[]}
      sections={SECTIONS}
    />
  );
}
