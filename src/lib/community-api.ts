import { parseJsonStringArray } from '@/lib/community';
import { supabase } from '@/lib/supabase';
import type {
  Amenity,
  AmenityBooking,
  Complaint,
  ComplaintStatus,
  ComplaintWithFlat,
  Notice,
  Poll,
  PollVote,
  Profile,
  StaffMember,
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

export async function castVote(input: {
  pollId: string;
  userId: string;
  option: string;
}): Promise<void> {
  const { error } = await supabase.from('poll_votes').insert({
    poll_id: input.pollId,
    user_id: input.userId,
    option: input.option,
  });
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
      flats ( id, number )
    `,
    )
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as ComplaintWithFlat[]) ?? [];
}

export async function createComplaint(input: {
  flatId: string;
  category: string;
  description: string;
}): Promise<void> {
  const { error } = await supabase.from('complaints').insert({
    flat_id: input.flatId,
    category: input.category,
    description: input.description,
    status: 'open',
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
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data as Array<Omit<Amenity, 'slots'> & { slots: unknown }>) ?? []).map((row) => ({
    ...row,
    slots: parseJsonStringArray(row.slots),
  }));
}

export async function upsertAmenity(input: {
  id?: string;
  societyId: string;
  name: string;
  description: string;
  slots: string[];
}): Promise<void> {
  if (input.id) {
    const { error } = await supabase
      .from('amenities')
      .update({
        name: input.name,
        description: input.description || null,
        slots: input.slots,
      })
      .eq('id', input.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from('amenities').insert({
    society_id: input.societyId,
    name: input.name,
    description: input.description || null,
    slots: input.slots,
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

async function uploadPublicImage(
  bucket: string,
  societyId: string,
  uri: string,
): Promise<string | null> {
  try {
    const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${societyId}/${Date.now()}.${ext}`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const { error } = await supabase.storage.from(bucket).upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      upsert: false,
    });
    if (error) {
      console.warn(`${bucket} upload failed:`, error.message);
      return null;
    }
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.warn(`${bucket} upload error:`, e);
    return null;
  }
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
