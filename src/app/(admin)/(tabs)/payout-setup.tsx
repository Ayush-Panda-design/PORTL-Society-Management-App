import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react-native';
import { Linking, Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { EmptyState } from '@/components/visitors/empty-state';
import { ErrorBanner } from '@/components/visitors/error-banner';
import { SkeletonList } from '@/components/visitors/loading-state';
import { Brand, FontFamily, Pastels } from '@/constants/theme';
import { fetchSocietyPaymentAccount } from '@/lib/ops-api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authStore';

const RAZORPAY_ROUTE_DASHBOARD = 'https://dashboard.razorpay.com/app/route/accounts';

function statusBadge(status: string | null | undefined): { label: string; bg: string; fg: string } {
  switch (status) {
    case 'verified':
      return { label: 'Verified', bg: '#D1FAE5', fg: '#065F46' };
    case 'rejected':
      return { label: 'Rejected', bg: '#FEE2E2', fg: '#991B1B' };
    case 'pending':
    default:
      return { label: 'Pending verification', bg: '#FEF3C7', fg: '#92400E' };
  }
}

export default function AdminPayoutSetupScreen() {
  const societyId = useAuthStore((s) => s.profile?.society_id);

  const accountQuery = useQuery({
    queryKey: queryKeys.societyPaymentAccount(societyId ?? 'none'),
    queryFn: () => fetchSocietyPaymentAccount(societyId!),
    enabled: Boolean(societyId),
  });

  if (!societyId) {
    return (
      <ScreenHeader title="Payout setup" showBack>
        <EmptyState
          visual="disconnected"
          title="No society linked"
          subtitle="Assign a society to your admin profile."
        />
      </ScreenHeader>
    );
  }

  const account = accountQuery.data;
  const badge = statusBadge(account?.status);

  return (
    <ScreenHeader
      title="Payout setup"
      subtitle="Razorpay Route · society settlements"
      showBack
    >
      {accountQuery.error ? (
        <ErrorBanner
          message={accountQuery.error.message}
          onRetry={() => void accountQuery.refetch()}
        />
      ) : null}
      {accountQuery.isLoading && !accountQuery.data ? (
        <SkeletonList count={2} />
      ) : (
        <View className="px-4">
          <Card>
            <Text className="text-xs font-bold uppercase tracking-widest text-ink-muted">
              Onboarding status
            </Text>
            <View
              className="mt-2 self-start rounded-pill px-3 py-1"
              style={{ backgroundColor: badge.bg }}
            >
              <Text className="text-[12px] font-semibold" style={{ color: badge.fg }}>
                {account ? badge.label : 'Not started'}
              </Text>
            </View>
            {account?.razorpay_account_id ? (
              <Text className="mt-3 text-sm text-ink-muted">
                Linked account ID ·••• {account.razorpay_account_id.slice(-4)}
              </Text>
            ) : (
              <Text className="mt-3 text-sm text-ink-muted">
                No Razorpay linked account on file yet. Complete onboarding in the Razorpay
                dashboard — bank details stay with Razorpay, not in Portl.
              </Text>
            )}
            <Text className="mt-2 text-xs text-ink-soft">
              Payout dates and settlement amounts are managed in Razorpay Route after verification.
            </Text>
            <Pressable
              onPress={() => {
                void Linking.openURL(RAZORPAY_ROUTE_DASHBOARD);
              }}
              className="mt-4 flex-row items-center justify-center gap-2 rounded-bubbly py-3"
              style={{ backgroundColor: Pastels.mint }}
            >
              <ExternalLink color={Brand.primary} size={18} strokeWidth={1.5} />
              <Text style={{ fontFamily: FontFamily.heading, color: Brand.primary }}>
                Open Razorpay payout dashboard
              </Text>
            </Pressable>
          </Card>
        </View>
      )}
    </ScreenHeader>
  );
}
