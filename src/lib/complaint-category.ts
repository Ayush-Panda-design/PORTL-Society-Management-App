import {
  Car,
  Droplets,
  Leaf,
  ShieldAlert,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

import { Brand, getPastels, type PastelTone } from '@/constants/theme';

export type ComplaintCategoryMeta = {
  Icon: LucideIcon;
  color: string;
  bg: string;
};

type CategoryDef = {
  Icon: LucideIcon;
  color: string;
  bg: PastelTone;
};

const CATEGORY_META: Record<string, CategoryDef> = {
  Parking: { Icon: Car, color: '#F43F5E', bg: 'lilac' },
  Plumbing: { Icon: Droplets, color: '#2563EB', bg: 'sky' },
  Electrical: { Icon: Zap, color: '#C4861A', bg: 'butter' },
  Housekeeping: { Icon: Leaf, color: Brand.primary, bg: 'mint' },
  Security: { Icon: ShieldAlert, color: '#E11D48', bg: 'rose' },
  Noise: { Icon: Wrench, color: '#B06020', bg: 'peach' },
  Other: { Icon: Wrench, color: Brand.inkMuted, bg: 'sage' },
};

const FALLBACK: CategoryDef = {
  Icon: Wrench,
  color: Brand.inkMuted,
  bg: 'sage',
};

export function complaintCategoryMeta(
  category: string,
  scheme?: 'light' | 'dark',
): ComplaintCategoryMeta {
  const def = CATEGORY_META[category] ?? FALLBACK;
  return {
    Icon: def.Icon,
    color: def.color,
    bg: getPastels(scheme)[def.bg],
  };
}
