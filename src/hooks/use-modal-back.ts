import { useEffect, useRef } from 'react';

import { pushModalDismiss } from '@/lib/modal-back-stack';

/**
 * While `visible` is true, Android system back closes this modal/sheet
 * before navigating away from the screen.
 */
export function useModalBack(visible: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!visible) return;
    return pushModalDismiss(() => onCloseRef.current());
  }, [visible]);
}
