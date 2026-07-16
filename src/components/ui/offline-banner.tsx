import { WifiOff } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontFamily } from '@/constants/theme';
import { useNetworkStatus } from '@/hooks/use-network-status';

export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const { isConnected } = useNetworkStatus();

  if (isConnected) return null;

  return (
    <View
      className="absolute left-0 right-0 z-50 flex-row items-center justify-center gap-2 bg-ink px-4 py-2.5"
      style={{ top: insets.top }}
      pointerEvents="none"
    >
      <WifiOff color="#F8FAFC" size={16} />
      <Text
        className="text-sm text-white"
        style={{ fontFamily: FontFamily.medium }}
      >
        No internet connection
      </Text>
    </View>
  );
}
