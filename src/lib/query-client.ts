import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const queryKeys = {
  notices: (societyId: string) => ['notices', societyId] as const,
  polls: (societyId: string) => ['polls', societyId] as const,
  poll: (pollId: string) => ['poll', pollId] as const,
  pollVotes: (societyId: string, pollIds: string[]) =>
    [...queryKeys.polls(societyId), 'votes', ...pollIds] as const,
  myPollVotes: (societyId: string, userId: string, pollIds: string[]) =>
    [...queryKeys.polls(societyId), 'my-votes', userId, ...pollIds] as const,
  pollOptionCounts: (pollId: string) => ['poll-option-counts', pollId] as const,
  complaints: (key: string) => ['complaints', key] as const,
  complaintComments: (complaintId: string) => ['complaint-comments', complaintId] as const,
  amenities: (societyId: string) => ['amenities', societyId] as const,
  amenityBookings: (amenityId: string, date: string) =>
    ['amenity-bookings', amenityId, date] as const,
  myAmenityBookings: (flatId: string) => ['my-amenity-bookings', flatId] as const,
  societyAmenityBookings: (societyId: string) =>
    ['society-amenity-bookings', societyId] as const,
  societyAmenityWaitlist: (societyId: string) =>
    ['society-amenity-waitlist', societyId] as const,
  adminAmenityRevenue: (societyId: string) =>
    ['admin-amenity-revenue', societyId] as const,
  societyPaymentAccount: (societyId: string) =>
    ['society-payment-account', societyId] as const,
  staff: (societyId: string) => ['staff', societyId] as const,
  directoryMembers: (societyId: string) => ['directory-members', societyId] as const,
  societyProfiles: (societyId: string) => ['society-profiles', societyId] as const,
  towers: (societyId: string) => ['towers', societyId] as const,
  flats: (societyId: string) => ['flats', societyId] as const,
  residents: (societyId: string) => ['residents', societyId] as const,
  pendingMembers: (societyId: string) => ['pending-members', societyId] as const,
  inviteCodes: (societyId: string) => ['invite-codes', societyId] as const,
  adminDashboard: (societyId: string) => ['admin-dashboard', societyId] as const,
  profilePrivate: (userId: string) => ['profile-private', userId] as const,
  profileNotes: (userId: string) => ['profile-notes', userId] as const,
  frequentVisitors: (flatId: string) => ['frequent-visitors', flatId] as const,
  paymentStatement: (userId: string) => ['payment-statement', userId] as const,
  auditLogs: (societyId: string) => ['audit-logs', societyId] as const,
  myPermissions: (userId: string) => ['my-permissions', userId] as const,
  noticeAcks: (userId: string, noticeIds: string[]) =>
    ['notice-acks', userId, ...noticeIds] as const,
  noticeAckStats: (noticeId: string) => ['notice-ack-stats', noticeId] as const,
  gates: (societyId: string) => ['gates', societyId] as const,
  broadcasts: (societyId: string) => ['broadcasts', societyId] as const,
};
