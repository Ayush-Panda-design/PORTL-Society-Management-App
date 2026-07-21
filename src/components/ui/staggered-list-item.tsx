import type { ReactNode } from 'react';
import { MotiView } from 'moti';

type Props = {
  index: number;
  children: ReactNode;
  /** Skip animation (refresh / pagination). */
  disabled?: boolean;
  stepMs?: number;
};

/**
 * Fade + slide-up entrance with staggered delay.
 * Only animates on first mount when enabled.
 */
export function StaggeredListItem({
  index,
  children,
  disabled = false,
  stepMs = 45,
}: Props) {
  if (disabled) return <>{children}</>;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        type: 'timing',
        duration: 280,
        delay: Math.min(index, 12) * stepMs,
      }}
    >
      {children}
    </MotiView>
  );
}
