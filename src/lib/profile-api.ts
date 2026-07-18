import { supabase } from '@/lib/supabase';
import { uploadLocalImage } from '@/lib/storage-upload';
import type { Profile, ProfileNote, ProfilePrivate } from '@/types/database';

export type PublicProfileFields = Pick<
  Profile,
  | 'full_name'
  | 'phone'
  | 'bio'
  | 'occupation'
  | 'emergency_contact_name'
  | 'emergency_contact_phone'
  | 'vehicle_number'
  | 'avatar_url'
>;

export type PrivateProfileFields = Omit<ProfilePrivate, 'user_id' | 'updated_at'>;

export async function updatePublicProfile(
  userId: string,
  fields: PublicProfileFields,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: fields.full_name?.trim() || null,
      phone: fields.phone?.trim() || null,
      bio: fields.bio?.trim() || null,
      occupation: fields.occupation?.trim() || null,
      emergency_contact_name: fields.emergency_contact_name?.trim() || null,
      emergency_contact_phone: fields.emergency_contact_phone?.trim() || null,
      vehicle_number: fields.vehicle_number?.trim() || null,
      avatar_url: fields.avatar_url?.trim() || null,
    })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as Profile;
}

export async function uploadProfilePhoto(params: {
  societyId: string;
  uri: string;
  mimeType?: string | null;
  base64?: string | null;
}): Promise<string> {
  const { publicUrl, error } = await uploadLocalImage({
    bucket: 'profile-photos',
    societyId: params.societyId,
    uri: params.uri,
    mimeType: params.mimeType,
    base64: params.base64,
  });
  if (error || !publicUrl) {
    throw new Error(error ?? 'Photo upload failed');
  }
  return publicUrl;
}

export async function fetchPrivateProfile(userId: string): Promise<ProfilePrivate | null> {
  const { data, error } = await supabase
    .from('profile_private')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as ProfilePrivate) ?? null;
}

export async function upsertPrivateProfile(
  userId: string,
  fields: PrivateProfileFields,
): Promise<ProfilePrivate> {
  const payload = {
    user_id: userId,
    personal_email: fields.personal_email?.trim() || null,
    date_of_birth: fields.date_of_birth?.trim() || null,
    blood_group: fields.blood_group?.trim() || null,
    allergies: fields.allergies?.trim() || null,
    permanent_address: fields.permanent_address?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('profile_private')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as ProfilePrivate;
}

export async function fetchProfileNotes(userId: string): Promise<ProfileNote[]> {
  const { data, error } = await supabase
    .from('profile_notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as ProfileNote[]) ?? [];
}

export async function addProfileNote(userId: string, body: string): Promise<ProfileNote> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error('Note cannot be empty.');

  const { data, error } = await supabase
    .from('profile_notes')
    .insert({ user_id: userId, body: trimmed })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as ProfileNote;
}

export async function deleteProfileNote(noteId: string): Promise<void> {
  const { error } = await supabase.from('profile_notes').delete().eq('id', noteId);
  if (error) throw new Error(error.message);
}
