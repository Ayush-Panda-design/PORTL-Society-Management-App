import { RefreshControl, type RefreshControlProps } from 'react-native';

import { Brand } from '@/constants/theme';
import { useThemePalette } from '@/hooks/use-theme';

type Props = Omit<RefreshControlProps, 'tintColor' | 'colors' | 'progressBackgroundColor'>;

export function ThemedRefreshControl(props: Props) {
  const palette = useThemePalette();

  return (
    <RefreshControl
      tintColor={Brand.primary}
      colors={[Brand.primary]}
      progressBackgroundColor={palette.card}
      {...props}
    />
  );
}
