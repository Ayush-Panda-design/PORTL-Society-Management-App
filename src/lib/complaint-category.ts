import {
  Car,
  Droplets,
  Leaf,
  ShieldAlert,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

import { Brand, Pastels } from '@/constants/theme';

export type ComplaintCategoryMeta = {
  Icon: LucideIcon;
  color: string;
  bg: string;
};

const CATEGORY_META: Record<string, ComplaintCategoryMeta> = {
  Parking: { Icon: Car, color: '#6B5CC4', bg: Pastels.lilac },
  Plumbing: { Icon: Droplets, color: '#2563EB', bg: Pastels.sky },
  Electrical: { Icon: Zap, color: '#C4861A', bg: Pastels.butter },
  Housekeeping: { Icon: Leaf, color: Brand.primary, bg: Pastels.mint },
  Security: { Icon: ShieldAlert, color: '#C0392B', bg: Pastels.rose },
  Noise: { Icon: Wrench, color: '#B06020', bg: Pastels.peach },
  Other: { Icon: Wrench, color: Brand.inkMuted, bg: Pastels.sage },
};

const FALLBACK: ComplaintCategoryMeta = {
  Icon: Wrench,
  color: Brand.inkMuted,
  bg: Pastels.sage,
};

export function complaintCategoryMeta(category: string): ComplaintCategoryMeta {
  return CATEGORY_META[category] ?? FALLBACK;
}
