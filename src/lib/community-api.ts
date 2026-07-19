import { isPollExpired, parseJsonStringArray, todayISODate } from '@/lib/community';
import {
  notifyComplaintCreated,
  notifyComplaintUpdated,
  notifyNoticeCreated,
  notifyPollCreated,
  notifyPollResultsPublished,
  societyIdForFlat,
} from '@/lib/notifications';
import { uploadLocalImage } from '@/lib/storage-upload';
import { supabase } from '@/lib/supabase';
import type {
  AdminDashboardStats,
  Amenity,
  AmenityBooking,
  AmenityBookingWithDetails,
  Complaint,
  ComplaintReporter,
  ComplaintStatus,
  ComplaintWithFlat,
  Flat,
  FlatWithTower,
  Notice,
  Poll,
  PollVote,
  PollVoteWithProfile,
  Profile,
  ProfileWithFlat,
  StaffMember,
  Tower,
} from '@/types/database';

export async function fetchNotices(societyId: string): Promise<Notice[]> {
  const { data, error } = await supabase
    .from('notices')
    .select('*')
    .eq('society_id', societyId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as Notice[]) ?? [];
}

export async function upsertNotice(input: {
  id?: string;
  societyId: string;
  title: string;
  body: string;
  postedBy: string;
  coverUrl?: string | null;
}): Promise<void> {
  if (input.id) {
    const { error } = await supabase
      .from('notices')
      .update({
        title: input.title,
        body: input.body,
        cover_url: input.coverUrl ?? null,
      })
      .eq('id', input.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { data, error } = await supabase
    .from('notices')
    .insert({
      society_id: input.societyId,
      title: input.title,
      body: input.body,
      posted_by: input.postedBy,
      cover_url: input.coverUrl ?? null,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  void notifyNoticeCreated({
    societyId: input.societyId,
    title: input.title,
    body: input.body,
    noticeId: data?.id,
  });
}

export async function deleteNotice(id: string): Promise<void> {
  const { error } = await supabase.from('notices').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchPolls(societyId: string): Promise<Poll[]> {
  const { data, error } = await supabase
    .from('polls')
    .select('*')
    .eq('society_id', societyId)
    .order('expires_at', { ascending: false, nullsFirst: false });

  if (error) throw new Error(error.message);

  return ((data as Array<Omit<Poll, 'options'> & { options: unknown }>) ?? []).map((row) => ({
    ...row,
    options: parseJsonStringArray(row.options),
  }));
}

export async function fetchPoll(pollId: string): Promise<Poll | null> {
  const { data, error } = await supabase.from('polls').select('*').eq('id', pollId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as Omit<Poll, 'options'> & { options: unknown };
  return {
    ...row,
    options: parseJsonStringArray(row.options),
  };
}

export async function fetchVotesForPolls(pollIds: string[]): Promise<PollVote[]> {
  if (pollIds.length === 0) return [];
  const { data, error } = await supabase.from('poll_votes').select('*').in('poll_id', pollIds);
  if (error) throw new Error(error.message);
  return (data as PollVote[]) ?? [];
}

/** Own votes only (RLS also enforces this for non-admins). */
export async function fetchMyVotesForPolls(pollIds: string[]): Promise<PollVote[]> {
  if (pollIds.length === 0) return [];
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be signed in.');

  const { data, error } = await supabase
    .from('poll_votes')
    .select('*')
    .in('poll_id', pollIds)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
  return (data as PollVote[]) ?? [];
}

type ProfileFlatJoin = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  flats:
    | {
        number: string;
        towers: { name: string } | { name: string }[] | null;
      }
    | {
        number: string;
        towers: { name: string } | { name: string }[] | null;
      }[]
    | null;
};

function normalizeVoteProfile(
  profile: ProfileFlatJoin | null | undefined,
): PollVoteWithProfile['profile'] {
  if (!profile) return null;
  const flatsRaw = profile.flats;
  if (!flatsRaw) {
    return {
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      flats: null,
    };
  }
  const flat = Array.isArray(flatsRaw) ? flatsRaw[0] ?? null : flatsRaw;
  if (!flat) {
    return {
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      flats: null,
    };
  }
  const towers = Array.isArray(flat.towers) ? flat.towers[0] ?? null : flat.towers;
  return {
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    flats: { number: flat.number, towers },
  };
}

/** Votes + voter profiles. Fetches in two steps so a broken embed never hides votes. */
export async function fetchPollVotesWithProfiles(
  pollIds: string[],
): Promise<PollVoteWithProfile[]> {
  if (pollIds.length === 0) return [];

  const { data: votes, error } = await supabase
    .from('poll_votes')
    .select('id, poll_id, user_id, option')
    .in('poll_id', pollIds);

  if (error) throw new Error(error.message);

  const rows = (votes as PollVote[]) ?? [];
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((v) => v.user_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select(
      `
      id,
      full_name,
      avatar_url,
      flats (
        number,
        towers (
          name
        )
      )
    `,
    )
    .in('id', userIds);

  if (profilesError) throw new Error(profilesError.message);

  const byId = new Map(
    ((profiles as ProfileFlatJoin[]) ?? []).map((p) => [p.id, normalizeVoteProfile(p)]),
  );

  return rows.map((row) => ({
    ...row,
    profile: byId.get(row.user_id) ?? null,
  }));
}

export async function createPoll(input: {
  societyId: string;
  question: string;
  options: string[];
  expiresAt: string | null;
  createdBy: string;
}): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('polls')
    .insert({
      society_id: input.societyId,
      question: input.question,
      options: input.options,
      expires_at: input.expiresAt,
      created_by: input.createdBy,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  const pollId = data.id as string;
  void notifyPollCreated({
    societyId: input.societyId,
    pollId,
    question: input.question,
    excludeUserId: input.createdBy,
  });

  return { id: pollId };
}

export async function castVote(input: { pollId: string; option: string }): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be signed in to vote.');

  const poll = await fetchPoll(input.pollId);
  if (!poll) throw new Error('Poll not found.');
  if (isPollExpired(poll.expires_at)) {
    throw new Error('This poll has ended. Voting is closed.');
  }

  const { error } = await supabase.from('poll_votes').upsert(
    {
      poll_id: input.pollId,
      user_id: user.id,
      option: input.option,
    },
    { onConflict: 'poll_id,user_id' },
  );
  if (error) throw new Error(error.message);
}

export type PollOptionCountRow = { option: string; count: number };

/** Published tallies for members (or any tallies for admins via RPC). */
export async function fetchPollOptionCounts(pollId: string): Promise<PollOptionCountRow[]> {
  const { data, error } = await supabase.rpc('poll_option_counts', {
    p_poll_id: pollId,
  });
  if (error) throw new Error(error.message);

  if (data == null) return [];
  const rows = typeof data === 'string' ? (JSON.parse(data) as unknown) : data;
  if (!Array.isArray(rows)) return [];
  return rows.map((row: { option?: string; count?: number }) => ({
    option: String(row.option ?? ''),
    count: Number(row.count ?? 0),
  }));
}

export async function publishPollResults(pollId: string): Promise<{
  poll_id: string;
  results_published_at: string;
}> {
  const { data, error } = await supabase.rpc('publish_poll_results', {
    p_poll_id: pollId,
  });
  if (error) throw new Error(error.message);
  const row =
    typeof data === 'string'
      ? (JSON.parse(data) as { poll_id: string; results_published_at: string })
      : (data as { poll_id: string; results_published_at: string });

  const poll = await fetchPoll(pollId);
  if (poll) {
    void notifyPollResultsPublished({
      societyId: poll.society_id,
      pollId: poll.id,
      question: poll.question,
    });
  }

  return row;
}

export async function fetchComplaintsForFlat(flatId: string): Promise<Complaint[]> {
  const { data, error } = await supabase
    .from('complaints')
    .select('*')
    .eq('flat_id', flatId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Complaint[]) ?? [];
}

export async function fetchComplaintsForSociety(): Promise<ComplaintWithFlat[]> {
  const { data, error } = await supabase
    .from('complaints')
    .select(
      `
      *,
      flats (
        id,
        number,
        towers ( name )
      ),
      reporter:profiles!created_by (
        id,
        full_name,
        phone,
        avatar_url
      )
    `,
    )
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const rows = ((data as ComplaintWithFlat[]) ?? []).map((row) => {
    const flats = row.flats;
    const reporter = Array.isArray(row.reporter) ? row.reporter[0] ?? null : row.reporter;
    if (!flats) return { ...row, reporter };
    const towers = Array.isArray(flats.towers) ? flats.towers[0] ?? null : flats.towers;
    return { ...row, flats: { ...flats, towers }, reporter };
  });

  // Fallback for legacy rows still missing created_by: resolve resident by flat.
  const missingFlatIds = [
    ...new Set(
      rows
        .filter((r) => !r.reporter?.full_name && r.flat_id)
        .map((r) => r.flat_id),
    ),
  ];

  if (missingFlatIds.length === 0) return rows;

  const { data: flatResidents, error: residentsError } = await supabase
    .from('profiles')
    .select('id, full_name, phone, avatar_url, flat_id')
    .in('flat_id', missingFlatIds)
    .eq('role', 'resident')
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (residentsError) {
    console.warn('Could not resolve complaint reporters by flat:', residentsError.message);
    return rows;
  }

  const byFlat = new Map<string, ComplaintReporter>();
  for (const person of flatResidents ?? []) {
    const flatId = person.flat_id as string | null;
    if (!flatId || byFlat.has(flatId)) continue;
    byFlat.set(flatId, {
      id: person.id as string,
      full_name: (person.full_name as string | null) ?? null,
      phone: (person.phone as string | null) ?? null,
      avatar_url: (person.avatar_url as string | null) ?? null,
    });
  }

  return rows.map((row) => {
    if (row.reporter?.full_name) return row;
    const fallback = byFlat.get(row.flat_id);
    return fallback ? { ...row, reporter: fallback } : row;
  });
}

export async function createComplaint(input: {
  flatId: string;
  category: string;
  description: string;
  createdBy: string;
}): Promise<void> {
  const { data, error } = await supabase
    .from('complaints')
    .insert({
      flat_id: input.flatId,
      category: input.category,
      description: input.description,
      status: 'open',
      created_by: input.createdBy,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  const societyId = await societyIdForFlat(input.flatId);
  if (societyId && data?.id) {
    void notifyComplaintCreated({
      societyId,
      complaintId: data.id as string,
      category: input.category,
      description: input.description,
      excludeUserId: input.createdBy,
    });
  }
}

export async function updateComplaint(input: {
  id: string;
  status: ComplaintStatus;
  assignedTo: string | null;
}): Promise<void> {
  const { data: existing } = await supabase
    .from('complaints')
    .select('status, created_by')
    .eq('id', input.id)
    .maybeSingle();

  const { error } = await supabase
    .from('complaints')
    .update({ status: input.status, assigned_to: input.assignedTo })
    .eq('id', input.id);
  if (error) throw new Error(error.message);

  if (existing && existing.status !== input.status) {
    void notifyComplaintUpdated({
      reporterId: (existing.created_by as string | null) ?? null,
      complaintId: input.id,
      status: input.status,
    });
  }
}

export async function fetchAmenities(societyId: string): Promise<Amenity[]> {
  const { data, error } = await supabase
    .from('amenities')
    .select('*')
    .eq('society_id', societyId)
    .order('is_featured', { ascending: false })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data as Array<Omit<Amenity, 'slots'> & { slots: unknown }>) ?? []).map((row) => ({
    ...row,
    slots: parseJsonStringArray(row.slots),
    is_featured: Boolean(row.is_featured),
  }));
}

export async function upsertAmenity(input: {
  id?: string;
  societyId: string;
  name: string;
  description: string;
  slots: string[];
  coverUrl?: string | null;
  isFeatured?: boolean;
  location?: string | null;
  capacity?: number | null;
  rules?: string | null;
  bookingHorizonDays?: number | null;
  maxActiveBookingsPerFlat?: number | null;
}): Promise<void> {
  const horizon = input.bookingHorizonDays ?? 7;
  const payload = {
    name: input.name,
    description: input.description || null,
    slots: input.slots,
    cover_url: input.coverUrl ?? null,
    is_featured: Boolean(input.isFeatured),
    location: input.location?.trim() || null,
    capacity: input.capacity ?? 1,
    rules: input.rules?.trim() || null,
    booking_horizon_days: Math.max(1, Math.min(14, horizon)),
    max_active_bookings_per_flat: input.maxActiveBookingsPerFlat ?? 2,
  };

  if (input.isFeatured) {
    // Keep a single featured amenity per society for a clear special section.
    let clearQuery = supabase
      .from('amenities')
      .update({ is_featured: false })
      .eq('society_id', input.societyId);
    if (input.id) {
      clearQuery = clearQuery.neq('id', input.id);
    }
    const { error: clearError } = await clearQuery;
    if (clearError) throw new Error(clearError.message);
  }

  if (input.id) {
    const { error } = await supabase.from('amenities').update(payload).eq('id', input.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from('amenities').insert({
    society_id: input.societyId,
    ...payload,
  });
  if (error) throw new Error(error.message);
}

export async function deleteAmenity(id: string): Promise<void> {
  const { error } = await supabase.from('amenities').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchBookingsForDate(
  amenityId: string,
  date: string,
): Promise<AmenityBooking[]> {
  const { data, error } = await supabase
    .from('amenity_bookings')
    .select('*')
    .eq('amenity_id', amenityId)
    .eq('date', date)
    .eq('status', 'booked');
  if (error) throw new Error(error.message);
  return (data as AmenityBooking[]) ?? [];
}

type FlatTowerJoin = {
  number: string;
  towers: { name: string } | { name: string }[] | null;
};

type AmenityBookingJoinRow = AmenityBooking & {
  amenities: { id: string; name: string } | { id: string; name: string }[] | null;
  flats: FlatTowerJoin | FlatTowerJoin[] | null;
};

function normalizeBookingDetails(row: AmenityBookingJoinRow): AmenityBookingWithDetails {
  const amenityRaw = row.amenities;
  const amenity = Array.isArray(amenityRaw) ? amenityRaw[0] ?? null : amenityRaw;
  const flatRaw = row.flats;
  const flat = Array.isArray(flatRaw) ? flatRaw[0] ?? null : flatRaw;
  const towerRaw = flat?.towers ?? null;
  const tower = Array.isArray(towerRaw) ? towerRaw[0] ?? null : towerRaw;
  const { amenities: _a, flats: _f, ...booking } = row;
  return {
    ...booking,
    amenity: amenity ? { id: amenity.id, name: amenity.name } : null,
    flat: flat
      ? {
          number: flat.number,
          towers: tower ? { name: tower.name } : null,
        }
      : null,
  };
}

/** Upcoming (and today) active bookings for a flat — My Bookings. */
export async function fetchMyAmenityBookings(flatId: string): Promise<AmenityBookingWithDetails[]> {
  const today = todayISODate();
  const { data, error } = await supabase
    .from('amenity_bookings')
    .select(
      `
      *,
      amenities ( id, name ),
      flats (
        number,
        towers ( name )
      )
    `,
    )
    .eq('flat_id', flatId)
    .eq('status', 'booked')
    .gte('date', today)
    .order('date', { ascending: true })
    .order('slot', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data as AmenityBookingJoinRow[]) ?? []).map(normalizeBookingDetails);
}

/** Society-wide upcoming bookings for admin oversight. */
export async function fetchSocietyAmenityBookings(
  societyId: string,
): Promise<AmenityBookingWithDetails[]> {
  const today = todayISODate();
  const { data: amenities, error: amenitiesError } = await supabase
    .from('amenities')
    .select('id')
    .eq('society_id', societyId);
  if (amenitiesError) throw new Error(amenitiesError.message);
  const amenityIds = ((amenities as { id: string }[]) ?? []).map((a) => a.id);
  if (amenityIds.length === 0) return [];

  const { data, error } = await supabase
    .from('amenity_bookings')
    .select(
      `
      *,
      amenities ( id, name ),
      flats (
        number,
        towers ( name )
      )
    `,
    )
    .in('amenity_id', amenityIds)
    .eq('status', 'booked')
    .gte('date', today)
    .order('date', { ascending: true })
    .order('slot', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data as AmenityBookingJoinRow[]) ?? []).map(normalizeBookingDetails);
}

export async function bookAmenitySlot(input: {
  amenityId: string;
  flatId: string;
  date: string;
  slot: string;
}): Promise<void> {
  const { error } = await supabase.rpc('book_amenity_slot', {
    p_amenity_id: input.amenityId,
    p_flat_id: input.flatId,
    p_date: input.date,
    p_slot: input.slot,
  });
  if (error) throw new Error(error.message);
}

export async function cancelAmenityBooking(bookingId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_amenity_booking', {
    p_booking_id: bookingId,
  });
  if (error) throw new Error(error.message);
}

export function amenityBookingFlatLabel(booking: AmenityBookingWithDetails): string {
  const flat = booking.flat;
  if (!flat) return 'Flat';
  const tower = flat.towers?.name;
  return tower ? `${tower} · Flat ${flat.number}` : `Flat ${flat.number}`;
}

export async function fetchStaff(societyId: string): Promise<StaffMember[]> {
  const { data, error } = await supabase
    .from('staff_directory')
    .select('*')
    .eq('society_id', societyId)
    .order('role', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as StaffMember[]) ?? [];
}

export async function upsertStaff(input: {
  id?: string;
  societyId: string;
  name: string;
  role: string;
  phone: string | null;
  photoUrl: string | null;
}): Promise<void> {
  if (input.id) {
    const { error } = await supabase
      .from('staff_directory')
      .update({
        name: input.name,
        role: input.role,
        phone: input.phone,
        photo_url: input.photoUrl,
      })
      .eq('id', input.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from('staff_directory').insert({
    society_id: input.societyId,
    name: input.name,
    role: input.role,
    phone: input.phone,
    photo_url: input.photoUrl,
  });
  if (error) throw new Error(error.message);
}

export async function deleteStaff(id: string): Promise<void> {
  const { error } = await supabase.from('staff_directory').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchSocietyProfiles(societyId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('society_id', societyId)
    .order('full_name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as Profile[]) ?? [];
}

export async function fetchTowers(societyId: string): Promise<Tower[]> {
  const { data, error } = await supabase
    .from('towers')
    .select('*')
    .eq('society_id', societyId)
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as Tower[]) ?? [];
}

export async function upsertTower(input: {
  id?: string;
  societyId: string;
  name: string;
}): Promise<Tower> {
  if (input.id) {
    const { data, error } = await supabase
      .from('towers')
      .update({ name: input.name })
      .eq('id', input.id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as Tower;
  }

  const { data, error } = await supabase
    .from('towers')
    .insert({ society_id: input.societyId, name: input.name })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Tower;
}

export async function deleteTower(id: string): Promise<void> {
  const { error } = await supabase.from('towers').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchFlats(societyId: string): Promise<FlatWithTower[]> {
  const { data, error } = await supabase
    .from('flats')
    .select(
      `
      id,
      tower_id,
      number,
      towers!inner (
        id,
        name,
        society_id
      )
    `,
    )
    .eq('towers.society_id', societyId)
    .order('number', { ascending: true });

  if (error) throw new Error(error.message);

  return ((data as FlatWithTower[]) ?? []).map((row) => ({
    ...row,
    towers: Array.isArray(row.towers) ? row.towers[0] ?? null : row.towers,
  }));
}

export async function upsertFlat(input: {
  id?: string;
  towerId: string;
  number: string;
}): Promise<Flat> {
  if (input.id) {
    const { data, error } = await supabase
      .from('flats')
      .update({ tower_id: input.towerId, number: input.number })
      .eq('id', input.id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as Flat;
  }

  const { data, error } = await supabase
    .from('flats')
    .insert({ tower_id: input.towerId, number: input.number })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Flat;
}

export async function deleteFlat(id: string): Promise<void> {
  const { error } = await supabase.from('flats').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchResidents(societyId: string): Promise<ProfileWithFlat[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
      *,
      flats (
        id,
        number,
        towers (
          id,
          name
        )
      )
    `,
    )
    .eq('society_id', societyId)
    .eq('role', 'resident')
    .eq('status', 'active')
    .order('full_name', { ascending: true });

  if (error) throw new Error(error.message);

  return ((data as ProfileWithFlat[]) ?? []).map((row) => {
    const flats = row.flats;
    if (!flats) return row;
    const towers = Array.isArray(flats.towers) ? flats.towers[0] ?? null : flats.towers;
    return { ...row, flats: { ...flats, towers } };
  });
}

/** Active society members for the resident directory (residents + admins). */
export async function fetchDirectoryMembers(
  societyId: string,
): Promise<ProfileWithFlat[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
      *,
      flats (
        id,
        number,
        towers (
          id,
          name
        )
      )
    `,
    )
    .eq('society_id', societyId)
    .eq('status', 'active')
    .in('role', ['resident', 'admin'])
    .order('full_name', { ascending: true });

  if (error) throw new Error(error.message);

  return ((data as ProfileWithFlat[]) ?? []).map((row) => {
    const flats = row.flats;
    if (!flats) return row;
    const towers = Array.isArray(flats.towers) ? flats.towers[0] ?? null : flats.towers;
    return { ...row, flats: { ...flats, towers } };
  });
}

export async function assignResidentFlat(input: {
  profileId: string;
  flatId: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ flat_id: input.flatId })
    .eq('id', input.profileId);
  if (error) throw new Error(error.message);
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfTodayIso(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export async function fetchAdminDashboardStats(
  societyId: string,
): Promise<AdminDashboardStats> {
  const todayStart = startOfTodayIso();
  const todayEnd = endOfTodayIso();
  const nowIso = new Date().toISOString();

  const [residents, pendingVisitors, openComplaints, activePolls] = await Promise.all([
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('society_id', societyId)
      .eq('role', 'resident')
      .eq('status', 'active'),
    supabase
      .from('visitors')
      .select('id', { count: 'exact', head: true })
      .eq('society_id', societyId)
      .eq('status', 'pending')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd),
    supabase
      .from('complaints')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open'),
    supabase
      .from('polls')
      .select('id', { count: 'exact', head: true })
      .eq('society_id', societyId)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`),
  ]);

  if (residents.error) throw new Error(residents.error.message);
  if (pendingVisitors.error) throw new Error(pendingVisitors.error.message);
  if (openComplaints.error) throw new Error(openComplaints.error.message);
  if (activePolls.error) throw new Error(activePolls.error.message);

  return {
    totalResidents: residents.count ?? 0,
    pendingVisitorsToday: pendingVisitors.count ?? 0,
    openComplaints: openComplaints.count ?? 0,
    activePolls: activePolls.count ?? 0,
  };
}

async function uploadPublicImage(
  bucket: string,
  societyId: string,
  uri: string,
): Promise<string | null> {
  const { publicUrl, error } = await uploadLocalImage({ bucket, societyId, uri });
  if (error) {
    console.warn(`${bucket} upload failed:`, error);
    return null;
  }
  return publicUrl;
}

export async function uploadStaffPhoto(
  societyId: string,
  uri: string,
): Promise<string | null> {
  return uploadPublicImage('staff-photos', societyId, uri);
}

export async function uploadNoticeCover(
  societyId: string,
  uri: string,
): Promise<string | null> {
  return uploadPublicImage('notice-covers', societyId, uri);
}

export async function uploadAmenityCover(
  societyId: string,
  uri: string,
): Promise<string | null> {
  return uploadPublicImage('amenity-covers', societyId, uri);
}
