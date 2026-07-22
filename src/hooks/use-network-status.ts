import { useEffect, useState } from 'react';
import { NativeModules, Platform } from 'react-native';

type NetworkStatus = {
  isConnected: boolean;
  isInternetReachable: boolean | null;
};

const defaultOnline: NetworkStatus = {
  isConnected: true,
  isInternetReachable: true,
};

/**
 * Tracks connectivity. On web, assumes online (browser handles offline).
 * NetInfo is loaded lazily so a dev build compiled before the package was added
 * still boots (offline banner stays hidden until you rebuild native).
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(defaultOnline);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    // If the native module wasn't bundled into the current Android build yet,
    // importing `@react-native-community/netinfo` can crash.
    // Guard early by checking for the native interface first.
    const hasNetInfoNative = Boolean((NativeModules as any)?.RNCNetInfo);
    // Helpful during development when the native module isn't linked yet.
    if (__DEV__) {
      console.log('[useNetworkStatus] netinfo native available:', hasNetInfoNative);
    }
    if (!hasNetInfoNative) return;

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const netinfoModule = await import('@react-native-community/netinfo');
        const NetInfo = netinfoModule?.default ?? netinfoModule;

        const apply = (state: {
          isConnected: boolean | null;
          isInternetReachable: boolean | null;
        }) => {
          if (cancelled) return;
          setStatus({
            isConnected: state.isConnected ?? false,
            isInternetReachable: state.isInternetReachable,
          });
        };

        const current = await NetInfo.fetch();
        apply(current);
        unsubscribe = NetInfo.addEventListener(apply);
      } catch {
        // Native module missing until `npx expo run:android` after adding netinfo.
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const offline =
    !status.isConnected || status.isInternetReachable === false;

  return {
    isConnected: !offline,
    isInternetReachable: offline ? false : status.isInternetReachable,
  };
}
