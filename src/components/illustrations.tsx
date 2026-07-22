import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { Brand, PastelsLight as Pastels } from '@/constants/theme';
import { useThemePalette } from '@/hooks/use-theme';

type Props = {
  width?: number;
  height?: number;
};

const sage = Brand.primary;
const sageDark = Brand.primaryDark;
const soft = Brand.primarySoft;
const peach = Pastels.peach;
const sky = Pastels.sky;
const butter = Pastels.butter;
const accent = Brand.accent;
const ink = '#94A3B8';

/** Multi-color fills for dashboard art — red used only as accent. */
const Illu = {
  red: Brand.primary,
  redDeep: Brand.primaryDark,
  rose: Pastels.rose,
  mint: '#34D399',
  mintDeep: '#059669',
  mintSoft: Pastels.mint,
  sky: '#60A5FA',
  skyDeep: '#2563EB',
  skySoft: Pastels.sky,
  gold: '#F59E0B',
  goldSoft: Pastels.butter,
  lilac: '#A78BFA',
  lilacSoft: Pastels.lilac,
  coral: Pastels.coral,
  white: '#FFFFFF',
} as const;

function useServiceSoft(tone: 'sky' | 'mint' | 'lilac' | 'coral' | 'butter') {
  const { isDark, pastels } = useThemePalette();
  if (!isDark) {
    if (tone === 'sky') return Illu.skySoft;
    if (tone === 'mint') return Illu.mintSoft;
    if (tone === 'lilac') return Illu.lilacSoft;
    if (tone === 'coral') return Illu.coral;
    return Illu.goldSoft;
  }
  return pastels[tone === 'butter' ? 'butter' : tone];
}


/** Person at a society gate / phone scan — auth branding. */
export function GateAuthIllustration({ width = 280, height = 180 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 180" fill="none">
      <Ellipse cx="140" cy="160" rx="118" ry="14" fill={soft} opacity={0.85} />
      <Rect x="26" y="44" width="74" height="104" rx="22" fill={sageDark} />
      <Rect x="38" y="58" width="20" height="24" rx="8" fill={soft} opacity={0.55} />
      <Rect x="62" y="58" width="20" height="24" rx="8" fill={soft} opacity={0.55} />
      <Rect x="38" y="92" width="20" height="24" rx="8" fill={soft} opacity={0.35} />
      <Rect x="62" y="92" width="20" height="24" rx="8" fill={soft} opacity={0.35} />
      <Rect x="178" y="36" width="74" height="112" rx="22" fill={sage} />
      <Rect x="190" y="52" width="22" height="26" rx="8" fill={soft} opacity={0.5} />
      <Rect x="218" y="52" width="22" height="26" rx="8" fill={soft} opacity={0.5} />
      <Rect x="190" y="90" width="22" height="26" rx="8" fill={soft} opacity={0.3} />
      <Rect x="218" y="90" width="22" height="26" rx="8" fill={soft} opacity={0.3} />
      <Rect x="122" y="68" width="36" height="80" rx="14" fill={sky} />
      <Rect x="130" y="78" width="20" height="28" rx="8" fill={soft} />
      <Circle cx="148" cy="120" r="3.5" fill={accent} />
      <Circle cx="150" cy="94" r="15" fill={butter} />
      <Path
        d="M134 148c2-18 8-28 16-28s14 10 16 28"
        stroke={sageDark}
        strokeWidth={12}
        strokeLinecap="round"
      />
      <Rect x="158" y="102" width="20" height="30" rx="8" fill={Brand.charcoal} />
      <Rect x="162" y="107" width="12" height="18" rx="4" fill={soft} />
    </Svg>
  );
}

export function QuietGateIllustration({ width = 200, height = 140 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 200 140" fill="none">
      <Ellipse cx="100" cy="128" rx="84" ry="10" fill={soft} opacity={0.9} />
      <Rect x="22" y="34" width="52" height="84" rx="20" fill={sageDark} />
      <Rect x="126" y="34" width="52" height="84" rx="20" fill={sage} />
      <Rect x="80" y="50" width="40" height="68" rx="16" fill={sky} opacity={0.9} />
      <Path d="M90 68h20M90 82h20M90 96h14" stroke={ink} strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx="100" cy="42" r="12" fill={peach} />
      <Circle cx="100" cy="42" r="6" fill={accent} opacity={0.85} />
    </Svg>
  );
}

export function EmptyMailboxIllustration({ width = 180, height = 130 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 180 130" fill="none">
      <Ellipse cx="90" cy="118" rx="74" ry="10" fill={soft} opacity={0.9} />
      <Rect x="38" y="46" width="104" height="62" rx="22" fill={sage} />
      <Rect x="52" y="60" width="76" height="10" rx="5" fill={soft} opacity={0.55} />
      <Path d="M38 62l52 30 52-30" stroke={sageDark} strokeWidth={4} strokeLinejoin="round" />
      <Rect x="76" y="28" width="28" height="24" rx="10" fill={accent} />
      <Circle cx="128" cy="42" r="10" fill={peach} opacity={0.9} />
    </Svg>
  );
}

export function EmptyVisitorsIllustration({ width = 180, height = 130 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 180 130" fill="none">
      <Ellipse cx="90" cy="118" rx="74" ry="10" fill={soft} opacity={0.9} />
      <Rect x="28" y="38" width="42" height="70" rx="18" fill={sageDark} />
      <Rect x="110" y="38" width="42" height="70" rx="18" fill={sage} />
      <Rect x="68" y="52" width="44" height="56" rx="18" fill={sky} />
      <Circle cx="90" cy="72" r="13" fill={ink} opacity={0.28} />
      <Path d="M76 100c4-12 8-16 14-16s10 4 14 16" stroke={ink} strokeWidth={7} opacity={0.28} />
    </Svg>
  );
}

export function BallotBoxIllustration({ width = 180, height = 130 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 180 130" fill="none">
      <Ellipse cx="90" cy="118" rx="74" ry="10" fill={soft} opacity={0.9} />
      <Rect x="42" y="50" width="96" height="58" rx="20" fill={sage} />
      <Rect x="68" y="44" width="44" height="12" rx="6" fill={sageDark} />
      <Rect x="76" y="26" width="28" height="30" rx="10" fill={accent} transform="rotate(-12 90 41)" />
      <Path d="M58 70h64M58 84h48" stroke={soft} strokeWidth={3.5} strokeLinecap="round" opacity={0.65} />
    </Svg>
  );
}

export function ToolboxIllustration({ width = 180, height = 130 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 180 130" fill="none">
      <Ellipse cx="90" cy="118" rx="74" ry="10" fill={soft} opacity={0.9} />
      <Rect x="38" y="56" width="104" height="52" rx="20" fill={sage} />
      <Rect x="66" y="44" width="48" height="18" rx="10" fill={sageDark} />
      <Circle cx="68" cy="82" r="9" fill={accent} />
      <Rect x="94" y="74" width="30" height="10" rx="5" fill={soft} opacity={0.75} />
      <Path d="M48 70h22" stroke={soft} strokeWidth={3.5} strokeLinecap="round" />
    </Svg>
  );
}

export function CalendarIllustration({ width = 180, height = 130 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 180 130" fill="none">
      <Ellipse cx="90" cy="118" rx="74" ry="10" fill={soft} opacity={0.9} />
      <Rect x="46" y="34" width="88" height="76" rx="22" fill="#fff" />
      <Rect x="46" y="34" width="88" height="26" rx="22" fill={sage} />
      <Rect x="46" y="48" width="88" height="12" fill={sage} />
      <Circle cx="70" cy="28" r="5" fill={accent} />
      <Circle cx="110" cy="28" r="5" fill={accent} />
      <G fill={sageDark} opacity={0.35}>
        <Rect x="60" y="70" width="14" height="12" rx="4" />
        <Rect x="82" y="70" width="14" height="12" rx="4" />
        <Rect x="104" y="70" width="14" height="12" rx="4" />
        <Rect x="60" y="88" width="14" height="12" rx="4" />
        <Rect x="82" y="88" width="14" height="12" rx="4" />
      </G>
    </Svg>
  );
}

export function NotConnectedIllustration({ width = 180, height = 130 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 180 130" fill="none">
      <Ellipse cx="90" cy="118" rx="74" ry="10" fill={soft} opacity={0.9} />
      <Circle cx="62" cy="70" r="24" fill={sage} opacity={0.22} />
      <Circle cx="118" cy="70" r="24" fill={accent} opacity={0.22} />
      <Path
        d="M78 70h24"
        stroke={ink}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray="4 6"
      />
      <Circle cx="62" cy="70" r="9" fill={sage} />
      <Circle cx="118" cy="70" r="9" fill={accent} />
    </Svg>
  );
}

export function VisitorSilhouette({ size = 80 }: { size?: number }) {
  const { pastels, primaryAccent, isDark } = useThemePalette();
  const fill = isDark ? pastels.rose : soft;
  const figure = isDark ? primaryAccent : sage;
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <Circle cx="40" cy="40" r="38" fill={fill} />
      <Circle cx="40" cy="32" r="14" fill={figure} opacity={0.55} />
      <Path
        d="M18 68c4-16 12-24 22-24s18 8 22 24"
        fill={figure}
        opacity={0.45}
      />
    </Svg>
  );
}

/** Circular service icon — Towers (sky + mint). */
export function ServiceTowersIcon({ size = 56 }: { size?: number }) {
  const softBg = useServiceSoft('sky');
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <Circle cx="28" cy="28" r="28" fill={softBg} />
      <Rect x="12" y="18" width="12" height="22" rx="3" fill={Illu.skyDeep} />
      <Rect x="28" y="12" width="14" height="28" rx="3" fill={Illu.sky} />
      <Rect x="15" y="22" width="3" height="3" rx="1" fill={Illu.white} opacity={0.85} />
      <Rect x="20" y="22" width="3" height="3" rx="1" fill={Illu.white} opacity={0.85} />
      <Rect x="31" y="16" width="3.5" height="3.5" rx="1" fill={Illu.white} opacity={0.9} />
      <Rect x="36.5" y="16" width="3.5" height="3.5" rx="1" fill={Illu.white} opacity={0.9} />
      <Circle cx="42" cy="38" r="6" fill={Illu.mint} />
    </Svg>
  );
}

/** Circular service icon — Residents (mint + gold). */
export function ServiceResidentsIcon({ size = 56 }: { size?: number }) {
  const softBg = useServiceSoft('mint');
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <Circle cx="28" cy="28" r="28" fill={softBg} />
      <Circle cx="22" cy="22" r="7" fill={Illu.mintDeep} />
      <Path d="M10 40c2-8 7-11 12-11s10 3 12 11" fill={Illu.mint} />
      <Circle cx="38" cy="24" r="6" fill={Illu.gold} />
      <Path d="M30 40c1-6 4-8 8-8s7 2 8 8" fill={Illu.gold} opacity={0.75} />
    </Svg>
  );
}

/** Circular service icon — Invites (lilac + red accent). */
export function ServiceInvitesIcon({ size = 56 }: { size?: number }) {
  const softBg = useServiceSoft('lilac');
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <Circle cx="28" cy="28" r="28" fill={softBg} />
      <Rect x="14" y="18" width="20" height="16" rx="5" fill={Illu.lilac} />
      <Path d="M14 22l10 7 10-7" stroke={Illu.white} strokeWidth={2} fill="none" />
      <Circle cx="38" cy="34" r="9" fill={Illu.gold} />
      <Circle cx="38" cy="34" r="3.5" fill={Illu.white} />
      <Path d="M38 43v5M35 46h6" stroke={Illu.redDeep} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

/** Circular service icon — Complaints (coral wash + blue checklist). */
export function ServiceComplaintsIcon({ size = 56 }: { size?: number }) {
  const softBg = useServiceSoft('coral');
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <Circle cx="28" cy="28" r="28" fill={softBg} />
      <Rect x="16" y="14" width="20" height="26" rx="5" fill={Illu.skyDeep} />
      <Rect x="21" y="11" width="10" height="6" rx="3" fill={Illu.sky} />
      <Path d="M21 24h10M21 29h8M21 34h6" stroke={Illu.white} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="38" cy="36" r="8" fill={Illu.mint} />
      <Path d="M35 36l2.2 2.2 4.5-5" stroke={Illu.white} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** Circular service icon — Notices (gold megaphone). */
export function ServiceNoticesIcon({ size = 56 }: { size?: number }) {
  const softBg = useServiceSoft('butter');
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <Circle cx="28" cy="28" r="28" fill={softBg} />
      <Path d="M14 26l16-8v24L14 34z" fill={Illu.gold} />
      <Rect x="10" y="26" width="7" height="8" rx="3" fill={Illu.red} />
      <Path d="M34 22c4 3 4 11 0 14" stroke={Illu.sky} strokeWidth={3} strokeLinecap="round" />
      <Path d="M39 18c7 5 7 19 0 24" stroke={Illu.mint} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

/** Circular service icon — Staff (teal phone). */
export function ServiceStaffIcon({ size = 56 }: { size?: number }) {
  const softBg = useServiceSoft('mint');
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <Circle cx="28" cy="28" r="28" fill={softBg} />
      <Path
        d="M20 18c3-3 7-3 10 0l3 3c1.5 1.5 1.5 4 0 5.5l-3 3c-1.5 1.5-1.5 3 0 4.5l4 4c1.5 1.5 4 1.5 5.5 0l3-3c3-3 7-3 10 0"
        stroke={Illu.mintDeep}
        strokeWidth={3.5}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx="40" cy="18" r="6" fill={Illu.sky} />
    </Svg>
  );
}

/** Invite people quick card — multi-color card + key. */
export function InviteKeyIllustration({ width = 88, height = 72 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 88 72" fill="none">
      <Ellipse cx="44" cy="64" rx="30" ry="6" fill={Illu.lilacSoft} opacity={0.9} />
      <Rect x="18" y="18" width="40" height="32" rx="10" fill={Illu.lilac} />
      <Rect x="26" y="26" width="24" height="6" rx="3" fill={Illu.white} opacity={0.85} />
      <Rect x="26" y="36" width="16" height="6" rx="3" fill={Illu.white} opacity={0.55} />
      <Circle cx="62" cy="34" r="14" fill={Illu.gold} />
      <Circle cx="62" cy="34" r="6" fill={Illu.white} />
      <Path d="M62 48v10M58 54h8" stroke={Illu.redDeep} strokeWidth={3.5} strokeLinecap="round" />
    </Svg>
  );
}

/** Track issues — blue chat bubble. */
export function HelpdeskChatIllustration({ width = 88, height = 72 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 88 72" fill="none">
      <Ellipse cx="44" cy="64" rx="30" ry="6" fill={Illu.skySoft} opacity={0.9} />
      <Path
        d="M18 22h40c6 0 10 4 10 10v14c0 6-4 10-10 10H36l-10 10v-10H18c-6 0-10-4-10-10V32c0-6 4-10 10-10z"
        fill={Illu.skyDeep}
      />
      <Circle cx="30" cy="38" r="3.5" fill={Illu.white} />
      <Circle cx="42" cy="38" r="3.5" fill={Illu.white} />
      <Circle cx="54" cy="38" r="3.5" fill={Illu.white} />
      <Rect x="58" y="14" width="22" height="18" rx="8" fill={Illu.mint} />
      <Path d="M64 23h10" stroke={Illu.white} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

/** Complaints — clipboard with mint check. */
export function ClipboardChecklistIllustration({ width = 88, height = 72 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 88 72" fill="none">
      <Ellipse cx="44" cy="64" rx="30" ry="6" fill={Illu.coral} opacity={0.85} />
      <Rect x="24" y="16" width="40" height="44" rx="10" fill={Illu.skyDeep} />
      <Rect x="34" y="12" width="20" height="10" rx="5" fill={Illu.sky} />
      <Path d="M34 32h20M34 40h16M34 48h12" stroke={Illu.white} strokeWidth={3} strokeLinecap="round" opacity={0.9} />
      <Circle cx="66" cy="28" r="10" fill={Illu.mint} />
      <Path d="M62 28l3 3 6-7" stroke={Illu.white} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Notices — gold megaphone. */
export function MegaphoneIllustration({ width = 88, height = 72 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 88 72" fill="none">
      <Ellipse cx="44" cy="64" rx="30" ry="6" fill={Illu.goldSoft} opacity={0.9} />
      <Path d="M22 34l28-14v36L22 42z" fill={Illu.gold} />
      <Rect x="16" y="34" width="10" height="12" rx="4" fill={Illu.red} />
      <Path d="M56 28c6 4 6 16 0 20" stroke={Illu.sky} strokeWidth={4} strokeLinecap="round" />
      <Path d="M64 22c10 6 10 26 0 32" stroke={Illu.mint} strokeWidth={3.5} strokeLinecap="round" />
      <Circle cx="30" cy="50" r="5" fill={Illu.lilac} />
    </Svg>
  );
}

/** Towers mini. */
export function TowersMiniIllustration({ width = 72, height = 56 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 72 56" fill="none">
      <Ellipse cx="36" cy="50" rx="26" ry="5" fill={Illu.skySoft} opacity={0.85} />
      <Rect x="10" y="14" width="20" height="32" rx="6" fill={Illu.skyDeep} />
      <Rect x="36" y="8" width="24" height="38" rx="6" fill={Illu.sky} />
      <Rect x="14" y="20" width="5" height="5" rx="1.5" fill={Illu.white} opacity={0.75} />
      <Rect x="21" y="20" width="5" height="5" rx="1.5" fill={Illu.white} opacity={0.75} />
      <Rect x="41" y="14" width="6" height="6" rx="1.5" fill={Illu.white} opacity={0.8} />
      <Rect x="50" y="14" width="6" height="6" rx="1.5" fill={Illu.white} opacity={0.8} />
      <Circle cx="58" cy="40" r="7" fill={Illu.mint} />
    </Svg>
  );
}

/** Flats door. */
export function FlatsDoorIllustration({ width = 72, height = 56 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 72 56" fill="none">
      <Ellipse cx="36" cy="50" rx="24" ry="5" fill={Illu.lilacSoft} opacity={0.85} />
      <Rect x="20" y="10" width="32" height="38" rx="8" fill={Illu.lilac} />
      <Rect x="26" y="18" width="20" height="30" rx="6" fill={Illu.skyDeep} />
      <Circle cx="40" cy="34" r="2.5" fill={Illu.gold} />
      <Rect x="30" y="22" width="8" height="8" rx="2" fill={Illu.white} opacity={0.45} />
    </Svg>
  );
}

/** Share link. */
export function ShareLinkIllustration({ width = 72, height = 56 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 72 56" fill="none">
      <Ellipse cx="36" cy="50" rx="24" ry="5" fill={Illu.goldSoft} opacity={0.85} />
      <Circle cx="26" cy="28" r="10" fill={Illu.sky} />
      <Circle cx="48" cy="28" r="10" fill={Illu.mint} />
      <Path d="M32 28h10" stroke={Illu.redDeep} strokeWidth={3.5} strokeLinecap="round" />
      <Circle cx="26" cy="28" r="3.5" fill={Illu.white} />
      <Circle cx="48" cy="28" r="3.5" fill={Illu.white} />
    </Svg>
  );
}

/** Members approve. */
export function MembersApproveIllustration({ width = 72, height = 56 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 72 56" fill="none">
      <Ellipse cx="36" cy="50" rx="24" ry="5" fill={Illu.mintSoft} opacity={0.85} />
      <Circle cx="30" cy="22" r="10" fill={Illu.skyDeep} />
      <Path d="M16 44c2-10 8-14 14-14s12 4 14 14" fill={Illu.sky} opacity={0.85} />
      <Circle cx="52" cy="30" r="12" fill={Illu.mint} />
      <Path d="M47 30l3.5 3.5 7-8" stroke={Illu.white} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Residents home. */
export function ResidentsHomeIllustration({ width = 72, height = 56 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 72 56" fill="none">
      <Ellipse cx="36" cy="50" rx="24" ry="5" fill={Illu.mintSoft} opacity={0.85} />
      <Path d="M14 30L36 12l22 18v20H14V30z" fill={Illu.mintDeep} />
      <Rect x="30" y="34" width="12" height="16" rx="3" fill={Illu.gold} />
      <Circle cx="50" cy="22" r="7" fill={Illu.sky} />
      <Circle cx="24" cy="24" r="5" fill={Illu.lilac} />
    </Svg>
  );
}

/** Staff phone. */
export function StaffPhoneIllustration({ width = 72, height = 56 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 72 56" fill="none">
      <Ellipse cx="36" cy="50" rx="24" ry="5" fill={Illu.skySoft} opacity={0.85} />
      <Path
        d="M26 18c4-4 10-4 14 0l4 4c2 2 2 5 0 7l-4 4c-2 2-2 4 0 6l6 6c2 2 5 2 7 0l4-4c4-4 10-4 14 0"
        stroke={Illu.mintDeep}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx="52" cy="18" r="8" fill={Illu.gold} />
      <Path d="M49 18h6M52 15v6" stroke={Illu.white} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}



