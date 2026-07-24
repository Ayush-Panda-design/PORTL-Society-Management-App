import type { ReactNode } from 'react';
import { useWindowDimensions, View, type ViewProps } from 'react-native';

import { MaxContentWidth } from '@/constants/theme';

type Props = ViewProps & {
  children: ReactNode;
  /** Max width on large screens / tablets. Defaults to theme MaxContentWidth. */
  maxWidth?: number;
};

/**
 * Centers content and caps width on tablets / large phones so layouts
 * don't stretch edge-to-edge on wide screens.
 */
export function ContentContainer({
  children,
  maxWidth = MaxContentWidth,
  style,
  ...rest
}: Props) {
  const { width } = useWindowDimensions();
  const pad = width > maxWidth ? Math.max(0, (width - maxWidth) / 2) : 0;

  return (
    <View
      {...rest}
      style={[{ flex: 1, width: '100%', paddingHorizontal: pad }, style]}
    >
      <View style={{ flex: 1, width: '100%', maxWidth, alignSelf: 'center' }}>
        {children}
      </View>
    </View>
  );
}
