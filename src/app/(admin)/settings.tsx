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

import { SettingsHub, type SettingsLink } from '@/components/ui/settings-hub';
import { useAuthStore } from '@/stores/authStore';
import { Brand } from '@/constants/theme';

const SECTIONS = [
  {
    title: 'Community Setup',
    links: [
      {
        href: '/(admin)/towers' as Href,
        title: 'Towers',
        subtitle: 'Add and rename society buildings',
        Icon: Building2,
        tone: 'sky' as const,
        iconColor: '#2563EB',
      },
      {
        href: '/(admin)/flats' as Href,
        title: 'Flats',
        subtitle: 'Map units to towers',
        Icon: Layers,
        tone: 'lilac' as const,
        iconColor: '#6B5CC4',
      },
      {
        href: '/(admin)/residents',
        title: 'Residents',
        subtitle: 'Assign members to flats',
        Icon: Users,
        tone: 'mint' as const,
        iconColor: Brand.primary,
      },
    ] as SettingsLink[],
  },
  {
    title: 'Access',
    links: [
      {
        href: '/(admin)/invites' as Href,
        title: 'Invite links',
        subtitle: 'Share resident and guard codes',
        Icon: KeyRound,
        tone: 'peach' as const,
        iconColor: Brand.accent,
      },
      {
        href: '/(admin)/join-requests' as Href,
        title: 'Join requests',
        subtitle: 'Approve or deny new members',
        Icon: UserPlus,
        tone: 'butter' as const,
        iconColor: '#C4861A',
      },
    ] as SettingsLink[],
  },
  {
    title: 'Operations',
    links: [
      {
        href: '/(admin)/polls',
        title: 'Polls',
        subtitle: 'Create polls and view results',
        Icon: BarChart3,
        tone: 'sky' as const,
        iconColor: '#2563EB',
      },
      {
        href: '/(admin)/complaints',
        title: 'Complaints',
        subtitle: 'Triage society helpdesk tickets',
        Icon: ClipboardList,
        tone: 'rose' as const,
        iconColor: '#C0392B',
      },
      {
        href: '/(admin)/amenities',
        title: 'Amenities',
        subtitle: 'Manage facilities and booking slots',
        Icon: Building2,
        tone: 'sage' as const,
        iconColor: Brand.primary,
      },
      {
        href: '/(admin)/staff',
        title: 'Staff directory',
        subtitle: 'Contacts residents can call',
        Icon: Phone,
        tone: 'mint' as const,
        iconColor: Brand.primary,
      },
    ] as SettingsLink[],
  },
];

export default function AdminSettingsMore() {
  const profile = useAuthStore((s) => s.profile);

  return (
    <SettingsHub
      title="Manage"
      subtitle={`${profile?.full_name ?? 'Admin'} · society tools`}
      links={[]}
      sections={SECTIONS}
    />
  );
}
