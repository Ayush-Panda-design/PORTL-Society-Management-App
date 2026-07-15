export type UserRole = 'resident' | 'guard' | 'admin';

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
  created_at: string;
};

export type Society = {
  id: string;
  name: string;
  address: string;
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

export type Complaint = {
  id: string;
  flat_id: string;
  category: string;
  description: string;
  status: ComplaintStatus;
  assigned_to: string | null;
  created_at: string;
};

export type ComplaintWithFlat = Complaint & {
  flats: { id: string; number: string } | null;
  assignee?: { id: string; full_name: string | null } | null;
};

export type Amenity = {
  id: string;
  society_id: string;
  name: string;
  description: string | null;
  slots: string[];
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
