import type { Href } from 'expo-router';
import { Platform } from 'react-native';

import type { UserRole } from '@/types/database';

export type PortlQuickActionId =
  | 'register-visitor'
  | 'scan-pass'
  | 'raise-complaint'
  | 'pre-approve'
  | 'ask-portl';

type QuickActionItem = {
  id: PortlQuickActionId;
  title: string;
  subtitle?: string;
  icon?: 'compose' | 'play' | 'pause' | 'add' | 'location' | 'search' | 'share' | 'prohibit' | 'contact' | 'home' | 'markLocation' | 'favorite' | 'love' | 'cloud' | 'invitation' | 'confirmation' | 'mail' | 'message' | 'date' | 'time' | 'capturePhoto' | 'captureVideo' | 'task' | 'taskCompleted' | 'alarm' | 'bookmark' | 'shuffle' | 'audio' | 'update' | null;
  params?: Record<string, string>;
};

function itemsForRole(role: UserRole): QuickActionItem[] {
  switch (role) {
    case 'guard':
      return [
        {
          id: 'register-visitor',
          title: 'Register Visitor',
          subtitle: 'Log a guest at the gate',
          icon: 'add',
        },
        {
          id: 'scan-pass',
          title: 'Scan Pass',
          subtitle: 'Check in with QR',
          icon: 'capturePhoto',
        },
      ];
    case 'resident':
      return [
        {
          id: 'raise-complaint',
          title: 'Raise Complaint',
          subtitle: 'Open helpdesk',
          icon: 'compose',
        },
        {
          id: 'pre-approve',
          title: 'Pre-approve Guest',
          subtitle: 'Skip the gate wait',
          icon: 'confirmation',
        },
        {
          id: 'ask-portl',
          title: 'Ask Portl',
          subtitle: 'Society assistant',
          icon: 'search',
        },
      ];
    case 'admin':
      return [
        {
          id: 'ask-portl',
          title: 'Ask Portl',
          icon: 'search',
        },
        {
          id: 'raise-complaint',
          title: 'Complaints',
          subtitle: 'Society helpdesk',
          icon: 'mail',
        },
      ];
    default:
      return [];
  }
}

export function hrefForQuickAction(
  id: string,
  role: UserRole | null,
): Href | null {
  if (!role) return null;
  switch (id) {
    case 'register-visitor':
      return role === 'guard' ? ('/(guard)/register-visitor' as Href) : null;
    case 'scan-pass':
      return role === 'guard' ? ('/(guard)/scan-pass' as Href) : null;
    case 'raise-complaint':
      if (role === 'resident') return '/(resident)/helpdesk' as Href;
      if (role === 'admin') return '/(admin)/complaints' as Href;
      return null;
    case 'pre-approve':
      return role === 'resident' ? ('/(resident)/pre-approve' as Href) : null;
    case 'ask-portl':
      if (role === 'resident') return '/(resident)/ask-portl' as Href;
      if (role === 'guard') return '/(guard)/ask-portl' as Href;
      if (role === 'admin') return '/(admin)/ask-portl' as Href;
      return null;
    default:
      return null;
  }
}

/** Registers home-screen long-press shortcuts for the signed-in role. */
export async function syncQuickActions(role: UserRole | null): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const QuickActions = await import('expo-quick-actions');
    if (!role) {
      await QuickActions.setItems([]);
      return;
    }
    await QuickActions.setItems(itemsForRole(role));
  } catch (e) {
    console.info('[quick-actions] unavailable:', e);
  }
}
