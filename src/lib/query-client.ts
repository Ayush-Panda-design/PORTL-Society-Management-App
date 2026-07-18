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
  pollVotes: (societyId: string, pollIds: string[]) =>
    [...queryKeys.polls(societyId), 'votes', ...pollIds] as const,
  complaints: (key: string) => ['complaints', key] as const,
  amenities: (societyId: string) => ['amenities', societyId] as const,
  amenityBookings: (amenityId: string, date: string) =>
    ['amenity-bookings', amenityId, date] as const,
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
};
