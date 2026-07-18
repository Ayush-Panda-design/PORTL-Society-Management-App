export type UserRole = 'resident' | 'guard' | 'admin';

export type MembershipStatus = 'pending' | 'active' | 'rejected';

export type InviteRole = 'resident' | 'guard';

export type VisitorType = 'guest' | 'delivery' | 'cab' | 'service';

export type VisitorStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'checked_in'
  | 'checked_out';

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  flat_id: string | null;
  society_id: string | null;
  status: MembershipStatus;
  push_token?: string | null;
  /** Short public bio — visible to society admins / members. */
  bio?: string | null;
  occupation?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  vehicle_number?: string | null;
  /** Public profile photo — visible to society admins / members. */
  avatar_url?: string | null;
  created_at: string;
};

/** Owner-only personal fields — never returned to admins via RLS. */
export type ProfilePrivate = {
  user_id: string;
  personal_email: string | null;
  date_of_birth: string | null;
  blood_group: string | null;
  allergies: string | null;
  permanent_address: string | null;
  updated_at: string;
};

/** Owner-only notes with auto timestamp. */
export type ProfileNote = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export type Society = {
  id: string;
  name: string;
  address: string;
  created_by?: string | null;
  created_at?: string;
};

export type InviteCode = {
  id: string;
  role: InviteRole;
  code: string;
  created_at: string;
  revoked_at: string | null;
};

export type InviteFlatOption = {
  id: string;
  number: string;
  tower_id: string;
  tower_name: string;
};

export type ResolvedInvite = {
  society_id: string;
  society_name: string;
  society_address: string;
  role: InviteRole;
  flats: InviteFlatOption[];
};

export type CreateSocietyResult = {
  society: Society;
  resident_invite_code: string;
  guard_invite_code: string;
};

export type JoinSocietyResult = {
  society_id: string;
  society_name: string;
  role: InviteRole;
  status: 'pending';
  flat_id: string | null;
};

export type Tower = {
  id: string;
  society_id: string;
  name: string;
};

export type Flat = {
  id: string;
  tower_id: string;
  number: string;
};

export type FlatWithTower = Flat & {
  towers:
    | Pick<Tower, 'id' | 'name' | 'society_id'>
    | Pick<Tower, 'id' | 'name' | 'society_id'>[]
    | null;
};

export type ProfileWithFlat = Profile & {
  flats:
    | (Pick<Flat, 'id' | 'number'> & {
        towers:
          | Pick<Tower, 'id' | 'name'>
          | Pick<Tower, 'id' | 'name'>[]
          | null;
      })
    | null;
};

export type AdminDashboardStats = {
  totalResidents: number;
  pendingVisitorsToday: number;
  openComplaints: number;
  activePolls: number;
};

export type Visitor = {
  id: string;
  name: string;
  phone: string | null;
  photo_url: string | null;
  purpose: string | null;
  type: VisitorType;
  status: VisitorStatus;
  flat_id: string;
  created_by: string | null;
  society_id: string;
  created_at: string;
};

export type VisitorWithFlat = Visitor & {
  flats: {
    id: string;
    number: string;
    towers:
      | { id: string; name: string; society_id: string }
      | { id: string; name: string; society_id: string }[]
      | null;
  } | null;
};

export type VisitorLog = {
  id: string;
  visitor_id: string;
  entry_time: string | null;
  exit_time: string | null;
  guard_id: string | null;
};

export type VisitorLogWithVisitor = VisitorLog & {
  visitors: VisitorWithFlat | null;
};

export const VISITOR_TYPES: { value: VisitorType; label: string }[] = [
  { value: 'guest', label: 'Guest' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'cab', label: 'Cab' },
  { value: 'service', label: 'Service' },
];

export const VISITOR_STATUSES: { value: VisitorStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'checked_in', label: 'Checked in' },
  { value: 'checked_out', label: 'Checked out' },
];

export type ComplaintStatus = 'open' | 'in_progress' | 'resolved';

export type Notice = {
  id: string;
  society_id: string;
  title: string;
  body: string;
  cover_url?: string | null;
  posted_by: string | null;
  created_at: string;
};

export type Poll = {
  id: string;
  society_id: string;
  question: string;
  options: string[];
  expires_at: string | null;
  created_by: string | null;
};

export type PollVote = {
  id: string;
  poll_id: string;
  user_id: string;
  option: string;
};

export type PollVoteWithProfile = PollVote & {
  profile: {
    full_name: string | null;
    avatar_url?: string | null;
    flats: {
      number: string;
      towers: { name: string } | { name: string }[] | null;
    } | null;
  } | null;
};

export type Complaint = {
  id: string;
  flat_id: string;
  category: string;
  description: string;
  status: ComplaintStatus;
  assigned_to: string | null;
  created_by?: string | null;
  created_at: string;
};

export type ComplaintReporter = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url?: string | null;
};

export type ComplaintWithFlat = Complaint & {
  flats:
    | {
        id: string;
        number: string;
        towers?: { name: string } | { name: string }[] | null;
      }
    | null;
  assignee?: { id: string; full_name: string | null } | null;
  reporter?: ComplaintReporter | null;
};

export type Amenity = {
  id: string;
  society_id: string;
  name: string;
  description: string | null;
  slots: string[];
  /** Optional custom cover — clients fall back to stock image when null. */
  cover_url?: string | null;
  /** Highlighted in the resident “Featured” section. */
  is_featured?: boolean;
  location?: string | null;
  capacity?: number | null;
  rules?: string | null;
};

export type AmenityBooking = {
  id: string;
  amenity_id: string;
  flat_id: string;
  date: string;
  slot: string;
  status: string;
};

export type StaffMember = {
  id: string;
  society_id: string;
  name: string;
  role: string;
  phone: string | null;
  photo_url: string | null;
};

export const COMPLAINT_CATEGORIES = [
  'Plumbing',
  'Electrical',
  'Housekeeping',
  'Security',
  'Parking',
  'Noise',
  'Other',
] as const;

export const COMPLAINT_STATUSES: { value: ComplaintStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
];

export const DEFAULT_AMENITY_SLOTS = [
  '06:00-07:00',
  '07:00-08:00',
  '08:00-09:00',
  '17:00-18:00',
  '18:00-19:00',
  '19:00-20:00',
];
