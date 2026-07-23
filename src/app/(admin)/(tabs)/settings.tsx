import {
  BarChart3,
  Building2,
  ClipboardList,
  DoorOpen,
  KeyRound,
  Layers,
  Megaphone,
  Phone,
  Shield,
  Sparkles,
  User,
  UserCog,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react-native';
import { type Href } from 'expo-router';

import { SettingsHub, type SettingsLink } from '@/components/ui/settings-hub';
import { useAuthStore } from '@/stores/authStore';

const SECTIONS = [
  {
    title: 'Account',
    links: [
      {
        href: '/(admin)/profile' as Href,
        title: 'My profile',
        subtitle: 'Bio, personal details, and private notes',
        Icon: User,
      },
      {
        href: '/(admin)/ask-portl' as Href,
        title: 'Ask Portl',
        subtitle: 'Society ops assistant — visitors, tickets, notices',
        Icon: Sparkles,
      },
    ] as SettingsLink[],
  },
  {
    title: 'Community setup',
    links: [
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
        href: '/(admin)/gates' as Href,
        title: 'Gates',
        subtitle: 'Multi-entry points for visitor logs',
        Icon: DoorOpen,
      },
      {
        href: '/(admin)/residents',
        title: 'Residents',
        subtitle: 'Assign members to flats',
        Icon: Users,
      },
      {
        href: '/(admin)/roles' as Href,
        title: 'Roles & escalation',
        subtitle: 'Committee permissions and visitor timers',
        Icon: UserCog,
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
      },
      {
        href: '/(admin)/join-requests' as Href,
        title: 'Join requests',
        subtitle: 'Approve or deny new members',
        Icon: UserPlus,
      },
    ] as SettingsLink[],
  },
  {
    title: 'Operations',
    links: [
      {
        href: '/(admin)/broadcasts' as Href,
        title: 'Broadcast alerts',
        subtitle: 'Push-only urgent society alerts',
        Icon: Megaphone,
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
        subtitle: 'Manage facilities and booking slots',
        Icon: Building2,
      },
      {
        href: '/(admin)/payout-setup' as Href,
        title: 'Payout setup',
        subtitle: 'Razorpay Route onboarding & settlements',
        Icon: Wallet,
      },
      {
        href: '/(admin)/staff',
        title: 'Staff directory',
        subtitle: 'Contacts residents can call',
        Icon: Phone,
      },
      {
        href: '/(admin)/audit-log' as Href,
        title: 'Audit log',
        subtitle: 'Who changed what, and when',
        Icon: Shield,
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
