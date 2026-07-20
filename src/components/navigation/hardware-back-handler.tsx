import { useEffect } from 'react';
import { BackHandler } from 'react-native';

import { useAppBack } from '@/hooks/use-app-back';

/** Android system back — same tab-aware behavior as header back, without forcing role home on root tabs. */
export function HardwareBackHandler() {
  const goBack = useAppBack({ allowRoleHomeFallback: false });

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => goBack());
    return () => subscription.remove();
  }, [goBack]);

  return null;
}
