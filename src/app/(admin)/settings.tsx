import {
  BarChart3,
  Building2,
  ClipboardList,
  KeyRound,
  Layers,
  Phone,
  UserPlus,
  Users,
} from 'lucide-react-native';
import { type Href } from 'expo-router';

import { SettingsHub } from '@/components/ui/settings-hub';
import { useAuthStore } from '@/stores/authStore';

const LINKS: {
  href: Href;
  title: string;
  subtitle: string;
  Icon: typeof Building2;
}[] = [
  {
    href: '/(admin)/invites' as Href,
    title: 'Invite links',
    subtitle: 'Share resident and guard codes',
    Icon: KeyRound,
  },
  {
    href: '/(admin)/join-requests' as Href,
    title: 'Join requests',
    subtitle: 'Approve or deny new members',
    Icon: UserPlus,
  },
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
  const profile = useAuthStore((s) => s.profile);

  return (
    <SettingsHub
      title="Manage"
      subtitle={`${profile?.full_name ?? 'Admin'} · society tools`}
      links={LINKS}
    />
  );
}
