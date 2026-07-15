import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

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

export function EmptyState({ title, subtitle, visual = 'default', action }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <Visual kind={visual} />
      <Text
        className="mt-4 text-center text-lg text-ink"
        style={{ fontFamily: FontFamily.heading }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text className="mt-2 text-center text-sm leading-5 text-ink-muted">{subtitle}</Text>
      ) : null}
      {action ? <View className="mt-4">{action}</View> : null}
    </View>
  );
}
