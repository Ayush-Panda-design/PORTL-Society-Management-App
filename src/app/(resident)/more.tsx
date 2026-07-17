import {
  BarChart3,
  Building2,
  ClipboardList,
  Phone,
  Users,
} from 'lucide-react-native';
import { type Href } from 'expo-router';

import { SettingsHub, type SettingsLink } from '@/components/ui/settings-hub';
import { useAuthStore } from '@/stores/authStore';
import { Brand } from '@/constants/theme';

const LINKS: SettingsLink[] = [
  {
    href: '/(resident)/polls' as Href,
    title: 'Polls',
    subtitle: 'Vote on society questions',
    Icon: BarChart3,
    tone: 'sky',
    iconColor: '#2563EB',
  },
  {
    href: '/(resident)/helpdesk' as Href,
    title: 'Helpdesk',
    subtitle: 'File and track complaints',
    Icon: ClipboardList,
    tone: 'butter',
    iconColor: '#C4861A',
  },
  {
    href: '/(resident)/amenities' as Href,
    title: 'Amenities',
    subtitle: 'Book gym, clubhouse, and more',
    Icon: Building2,
    tone: 'sage',
    iconColor: Brand.primary,
  },
  {
    href: '/(resident)/directory' as Href,
    title: 'Directory',
    subtitle: 'Staff & service contacts',
    Icon: Phone,
    tone: 'mint',
    iconColor: Brand.primary,
  },
  {
    href: '/(resident)/visitor-history' as Href,
    title: 'Visitor history',
    subtitle: 'Past guests for your flat',
    Icon: Users,
    tone: 'lilac',
    iconColor: '#6B5CC4',
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
