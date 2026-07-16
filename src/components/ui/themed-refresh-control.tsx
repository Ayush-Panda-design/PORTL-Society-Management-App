import { RefreshControl, type RefreshControlProps } from 'react-native';

import { Brand } from '@/constants/theme';

type Props = Omit<RefreshControlProps, 'tintColor' | 'colors'>;

export function ThemedRefreshControl(props: Props) {
  return (
    <RefreshControl
      tintColor={Brand.primary}
      colors={[Brand.primary]}
      progressBackgroundColor="#FFFFFF"
      {...props}
    />
  );
}
