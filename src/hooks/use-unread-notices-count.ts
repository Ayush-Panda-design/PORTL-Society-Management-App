import { useFeatureBadges, formatTabBadge, TAB_BADGE_STYLE } from '@/hooks/use-feature-badges';

/** Count of society notices this device has not opened yet. */
export function useUnreadNoticesCount(): number {
  return useFeatureBadges().notices;
}

export { formatTabBadge, TAB_BADGE_STYLE };
