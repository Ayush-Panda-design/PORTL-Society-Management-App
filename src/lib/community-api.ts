import { parseJsonStringArray } from '@/lib/community';
import { invokeSendPush } from '@/lib/push-notifications';
import { uploadLocalImage } from '@/lib/storage-upload';
import { supabase } from '@/lib/supabase';
import type {
  AdminDashboardStats,
  Amenity,
  AmenityBooking,
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

  const { error } = await supabase.from('notices').insert({
    society_id: input.societyId,
    title: input.title,
    body: input.body,
    posted_by: input.postedBy,
    cover_url: input.coverUrl ?? null,
  });
  if (error) throw new Error(error.message);

  // Notify society residents (batched via Edge Function). Non-blocking.
  void notifySocietyResidentsOfNotice({
    societyId: input.societyId,
    title: input.title,
    body: input.body,
  });
}

async function notifySocietyResidentsOfNotice(params: {
  societyId: string;
  title: string;
  body: string;
}): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('society_id', params.societyId)
      .eq('role', 'resident');

    if (error) {
      console.warn('[push] Failed to load residents for notice:', error.message);
      return;
    }

    const userIds = (data ?? []).map((row) => row.id as string);
    if (userIds.length === 0) return;

    const preview =
      params.body.length > 120 ? `${params.body.slice(0, 117)}…` : params.body;

    // Expo accepts up to 100 messages per request; Edge Function chunks further.
    const BATCH = 100;
    for (let i = 0; i < userIds.length; i += BATCH) {
      await invokeSendPush({
        userIds: userIds.slice(i, i + BATCH),
        title: params.title,
        body: preview,
        data: {
          type: 'notice',
          societyId: params.societyId,
        },
      });
    }
  } catch (e) {
    console.warn('[push] notice notify failed:', e);
  }
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

export async function fetchVotesForPolls(pollIds: string[]): Promise<PollVote[]> {
  if (pollIds.length === 0) return [];
  const { data, error } = await supabase.from('poll_votes').select('*').in('poll_id', pollIds);
  if (error) throw new Error(error.message);
  return (data as PollVote[]) ?? [];
}

type PollVoteProfileRow = PollVote & {
  profiles: PollVoteWithProfile['profile'];
};

export async function fetchPollVotesWithProfiles(
  pollIds: string[],
): Promise<PollVoteWithProfile[]> {
  if (pollIds.length === 0) return [];

  const { data, error } = await supabase
    .from('poll_votes')
    .select(
      `
      id,
      poll_id,
      user_id,
      option,
      profiles (
        full_name,
        flats (
          number,
          towers (
            name
          )
        )
      )
    `,
    )
    .in('poll_id', pollIds);

  if (error) throw new Error(error.message);

  return ((data as unknown as PollVoteProfileRow[]) ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles;
    const flats = profile?.flats;
    if (!flats) {
      return {
        id: row.id,
        poll_id: row.poll_id,
        user_id: row.user_id,
        option: row.option,
        profile,
      };
    }

    const flat = Array.isArray(flats) ? flats[0] ?? null : flats;
    if (!flat) {
      return {
        id: row.id,
        poll_id: row.poll_id,
        user_id: row.user_id,
        option: row.option,
        profile: profile ? { ...profile, flats: null } : null,
      };
    }

    const towers = Array.isArray(flat.towers) ? flat.towers[0] ?? null : flat.towers;
    return {
      id: row.id,
      poll_id: row.poll_id,
      user_id: row.user_id,
      option: row.option,
      profile: profile ? { ...profile, flats: { ...flat, towers } } : null,
    };
  });
}

export async function createPoll(input: {
  societyId: string;
  question: string;
  options: string[];
  expiresAt: string | null;
  createdBy: string;
}): Promise<void> {
  const { error } = await supabase.from('polls').insert({
    society_id: input.societyId,
    question: input.question,
    options: input.options,
    expires_at: input.expiresAt,
    created_by: input.createdBy,
  });
  if (error) throw new Error(error.message);
}

export async function castVote(input: { pollId: string; option: string }): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be signed in to vote.');

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
  const { error } = await supabase.from('complaints').insert({
    flat_id: input.flatId,
    category: input.category,
    description: input.description,
    status: 'open',
    created_by: input.createdBy,
  });
  if (error) throw new Error(error.message);
}

export async function updateComplaint(input: {
  id: string;
  status: ComplaintStatus;
  assignedTo: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from('complaints')
    .update({ status: input.status, assigned_to: input.assignedTo })
    .eq('id', input.id);
  if (error) throw new Error(error.message);
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
}): Promise<void> {
  const payload = {
    name: input.name,
    description: input.description || null,
    slots: input.slots,
    cover_url: input.coverUrl ?? null,
    is_featured: Boolean(input.isFeatured),
    location: input.location?.trim() || null,
    capacity: input.capacity ?? null,
    rules: input.rules?.trim() || null,
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

export async function bookAmenitySlot(input: {
  amenityId: string;
  flatId: string;
  date: string;
  slot: string;
}): Promise<void> {
  const existing = await fetchBookingsForDate(input.amenityId, input.date);
  if (existing.some((b) => b.slot === input.slot)) {
    throw new Error('That slot is already booked for this date.');
  }

  const { error } = await supabase.from('amenity_bookings').insert({
    amenity_id: input.amenityId,
    flat_id: input.flatId,
    date: input.date,
    slot: input.slot,
    status: 'booked',
  });
  if (error) throw new Error(error.message);
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
