import type { ReactNode } from 'react';
import { Text, View, Pressable } from 'react-native';
import LottieView from 'lottie-react-native';

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



const LOTTIE_FILES = {
  'no-data': require('@/assets/lottie/empty.json'),
  'inbox': require('@/assets/lottie/inbox.json'),
  'no-internet': require('@/assets/lottie/no-internet.json'),
};

function Visual({ kind }: { kind: EmptyVisual }) {
  let source;
  switch (kind) {
    case 'notices':
    case 'helpdesk':
      source = LOTTIE_FILES['inbox'];
      break;
    case 'disconnected':
      source = LOTTIE_FILES['no-internet'];
      break;
    case 'visitors':
    case 'polls':
    case 'amenities':
    case 'gate':
    case 'default':
    default:
      source = LOTTIE_FILES['no-data'];
      break;
  }

  return (
    <LottieView
      source={source}
      autoPlay
      loop
      style={{ width: 160, height: 160 }}
    />
  );
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
          className="mt-6 rounded-bubbly bg-charcoal px-7 py-3.5 active:opacity-70"
        >
          <Text className="text-[15px] text-white" style={{ fontFamily: FontFamily.heading }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}

      {action ? <View className="mt-4">{action}</View> : null}
    </View>
  );
}
