import type { ReactNode } from 'react';
import { Text, View, Pressable } from 'react-native';

import {
  BallotBoxIllustration,
  CalendarIllustration,
  EmptyMailboxIllustration,
  EmptyVisitorsIllustration,
  NotConnectedIllustration,
  QuietGateIllustration,
  ToolboxIllustration,
} from '@/components/illustrations';
import { FontFamily } from '@/constants/theme';

export type EmptyVisual =
  | 'default'
  | 'notices'
  | 'visitors'
  | 'polls'
  | 'helpdesk'
  | 'amenities'
  | 'gate'
  | 'disconnected';

type Props = {
  title: string;
  subtitle?: string;
  visual?: EmptyVisual;
  action?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
};

function Visual({ kind }: { kind: EmptyVisual }) {
  switch (kind) {
    case 'notices':
      return <EmptyMailboxIllustration />;
    case 'visitors':
      return <EmptyVisitorsIllustration />;
    case 'polls':
      return <BallotBoxIllustration />;
    case 'helpdesk':
      return <ToolboxIllustration />;
    case 'amenities':
      return <CalendarIllustration />;
    case 'gate':
      return <QuietGateIllustration />;
    case 'disconnected':
      return <NotConnectedIllustration />;
    default:
      return <NotConnectedIllustration />;
  }
}

export function EmptyState({ title, subtitle, visual = 'default', action, actionLabel, onAction }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <Visual kind={visual} />
      <Text
        className="mt-6 text-center text-[22px] font-bold text-ink"
        style={{ fontFamily: FontFamily.heading }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text className="mt-2 text-center text-[15px] leading-5 text-ink-muted px-4">{subtitle}</Text>
      ) : null}
      
      {actionLabel && onAction ? (
        <Pressable 
          onPress={onAction}
          className="mt-6 bg-brand-50 border border-brand-200 px-6 py-3 rounded-full active:opacity-70"
        >
          <Text className="text-brand-700 font-bold text-[15px]">{actionLabel}</Text>
        </Pressable>
      ) : null}

      {action ? <View className="mt-4">{action}</View> : null}
    </View>
  );
}
