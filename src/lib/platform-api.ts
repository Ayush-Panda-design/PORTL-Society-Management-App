import { supabase } from '@/lib/supabase';

export type PlatformConsoleStats = {
  societies: number;
  users: number;
  users_active: number;
  users_pending: number;
  admins: number;
  guards: number;
  residents: number;
  visitors: number;
  complaints_open: number;
  complaints_total: number;
  amenity_bookings: number;
  notices: number;
  payments_paid: number;
  payments_pending: number;
  revenue_paise: number;
};

export type PlatformConsoleUser = {
  id: string;
  full_name: string | null;
  role: string;
  status: string;
  phone: string | null;
  society_id: string | null;
  flat_id: string | null;
  avatar_url: string | null;
  created_at: string;
  society_name: string | null;
  email: string | null;
  is_platform_admin: boolean;
};

export type PlatformConsoleSociety = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  area: string | null;
  is_discoverable: boolean | null;
  created_at: string | null;
  member_count: number;
  admin_count: number;
};

function asStats(data: unknown): PlatformConsoleStats {
  const row = (data ?? {}) as Partial<PlatformConsoleStats>;
  return {
    societies: Number(row.societies ?? 0),
    users: Number(row.users ?? 0),
    users_active: Number(row.users_active ?? 0),
    users_pending: Number(row.users_pending ?? 0),
    admins: Number(row.admins ?? 0),
    guards: Number(row.guards ?? 0),
    residents: Number(row.residents ?? 0),
    visitors: Number(row.visitors ?? 0),
    complaints_open: Number(row.complaints_open ?? 0),
    complaints_total: Number(row.complaints_total ?? 0),
    amenity_bookings: Number(row.amenity_bookings ?? 0),
    notices: Number(row.notices ?? 0),
    payments_paid: Number(row.payments_paid ?? 0),
    payments_pending: Number(row.payments_pending ?? 0),
    revenue_paise: Number(row.revenue_paise ?? 0),
  };
}

function asArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (typeof data === 'string') {
    try {
      const parsed: unknown = JSON.parse(data);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** True when the signed-in user has a platform_admins row. */
export async function fetchIsPlatformAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('Failed to check platform admin:', error.message);
    return false;
  }
  return Boolean(data?.user_id);
}

export async function fetchPlatformConsoleStats(): Promise<PlatformConsoleStats> {
  const { data, error } = await supabase.rpc('platform_console_stats');
  if (error) throw new Error(error.message);
  return asStats(data);
}

export async function fetchPlatformConsoleUsers(options?: {
  limit?: number;
  offset?: number;
}): Promise<PlatformConsoleUser[]> {
  const { data, error } = await supabase.rpc('platform_console_users', {
    p_limit: options?.limit ?? 200,
    p_offset: options?.offset ?? 0,
  });
  if (error) throw new Error(error.message);
  return asArray<PlatformConsoleUser>(data);
}

export async function fetchPlatformConsoleSocieties(options?: {
  limit?: number;
  offset?: number;
}): Promise<PlatformConsoleSociety[]> {
  const { data, error } = await supabase.rpc('platform_console_societies', {
    p_limit: options?.limit ?? 100,
    p_offset: options?.offset ?? 0,
  });
  if (error) throw new Error(error.message);
  return asArray<PlatformConsoleSociety>(data);
}

export function formatPaiseAsInr(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}
