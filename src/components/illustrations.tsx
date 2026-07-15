import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { Brand } from '@/constants/theme';

type Props = {
  width?: number;
  height?: number;
};

const teal = Brand.primary;
const tealDark = Brand.primaryDark;
const soft = Brand.primarySoft;
const accent = Brand.accent;
const ink = '#94A3B8';

/** Person at a society gate / phone scan — auth branding. */
export function GateAuthIllustration({ width = 280, height = 180 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 180" fill="none">
      <Ellipse cx="140" cy="158" rx="110" ry="12" fill={soft} />
      <Rect x="28" y="48" width="72" height="100" rx="6" fill={tealDark} />
      <Rect x="38" y="58" width="18" height="22" rx="2" fill={soft} opacity={0.5} />
      <Rect x="62" y="58" width="18" height="22" rx="2" fill={soft} opacity={0.5} />
      <Rect x="38" y="90" width="18" height="22" rx="2" fill={soft} opacity={0.35} />
      <Rect x="62" y="90" width="18" height="22" rx="2" fill={soft} opacity={0.35} />
      <Path d="M100 148H28v-8h72v8z" fill={teal} />
      <Rect x="180" y="40" width="72" height="108" rx="6" fill={teal} />
      <Rect x="190" y="52" width="20" height="24" rx="2" fill={soft} opacity={0.45} />
      <Rect x="218" y="52" width="20" height="24" rx="2" fill={soft} opacity={0.45} />
      <Rect x="190" y="88" width="20" height="24" rx="2" fill={soft} opacity={0.3} />
      <Rect x="218" y="88" width="20" height="24" rx="2" fill={soft} opacity={0.3} />
      <Rect x="124" y="70" width="32" height="78" rx="3" fill="#CBD5E1" />
      <Rect x="130" y="78" width="20" height="30" rx="2" fill={soft} />
      <Circle cx="148" cy="118" r="3" fill={accent} />
      <Circle cx="150" cy="96" r="14" fill="#FDE68A" />
      <Path
        d="M136 148c2-18 8-28 14-28s12 10 14 28"
        stroke={tealDark}
        strokeWidth={10}
        strokeLinecap="round"
      />
      <Rect x="158" y="104" width="18" height="28" rx="3" fill={Brand.ink} />
      <Rect x="161" y="108" width="12" height="18" rx="1.5" fill={soft} />
    </Svg>
  );
}

export function QuietGateIllustration({ width = 200, height = 140 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 200 140" fill="none">
      <Ellipse cx="100" cy="126" rx="80" ry="8" fill={soft} />
      <Rect x="24" y="36" width="50" height="80" rx="4" fill={tealDark} />
      <Rect x="126" y="36" width="50" height="80" rx="4" fill={teal} />
      <Rect x="82" y="52" width="36" height="64" rx="2" fill="#CBD5E1" opacity={0.7} />
      <Path d="M88 70h24M88 82h24M88 94h16" stroke={ink} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="100" cy="44" r="10" fill={accent} opacity={0.85} />
    </Svg>
  );
}

export function EmptyMailboxIllustration({ width = 180, height = 130 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 180 130" fill="none">
      <Ellipse cx="90" cy="116" rx="70" ry="8" fill={soft} />
      <Rect x="40" y="48" width="100" height="58" rx="10" fill={teal} />
      <Rect x="52" y="60" width="76" height="8" rx="4" fill={soft} opacity={0.5} />
      <Path d="M40 60l50 28 50-28" stroke={tealDark} strokeWidth={4} strokeLinejoin="round" />
      <Rect x="78" y="30" width="24" height="22" rx="3" fill={accent} />
    </Svg>
  );
}

export function EmptyVisitorsIllustration({ width = 180, height = 130 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 180 130" fill="none">
      <Ellipse cx="90" cy="116" rx="70" ry="8" fill={soft} />
      <Rect x="30" y="40" width="40" height="66" rx="4" fill={tealDark} />
      <Rect x="110" y="40" width="40" height="66" rx="4" fill={teal} />
      <Path d="M70 55h40v50H70z" fill="#E2E8F0" />
      <Circle cx="90" cy="72" r="12" fill={ink} opacity={0.25} />
      <Path d="M78 98c4-10 8-14 12-14s8 4 12 14" stroke={ink} strokeWidth={6} opacity={0.25} />
    </Svg>
  );
}

export function BallotBoxIllustration({ width = 180, height = 130 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 180 130" fill="none">
      <Ellipse cx="90" cy="116" rx="70" ry="8" fill={soft} />
      <Rect x="45" y="52" width="90" height="54" rx="8" fill={teal} />
      <Rect x="70" y="46" width="40" height="10" rx="3" fill={tealDark} />
      <Rect x="78" y="28" width="24" height="28" rx="3" fill={accent} transform="rotate(-12 90 42)" />
      <Path d="M60 70h60M60 82h44" stroke={soft} strokeWidth={3} strokeLinecap="round" opacity={0.6} />
    </Svg>
  );
}

export function ToolboxIllustration({ width = 180, height = 130 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 180 130" fill="none">
      <Ellipse cx="90" cy="116" rx="70" ry="8" fill={soft} />
      <Rect x="40" y="58" width="100" height="48" rx="8" fill={teal} />
      <Rect x="68" y="46" width="44" height="16" rx="4" fill={tealDark} />
      <Circle cx="70" cy="82" r="8" fill={accent} />
      <Rect x="96" y="74" width="28" height="8" rx="2" fill={soft} opacity={0.7} />
      <Path d="M48 70h20" stroke={soft} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

export function CalendarIllustration({ width = 180, height = 130 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 180 130" fill="none">
      <Ellipse cx="90" cy="116" rx="70" ry="8" fill={soft} />
      <Rect x="48" y="36" width="84" height="72" rx="10" fill="#fff" stroke={teal} strokeWidth={3} />
      <Rect x="48" y="36" width="84" height="22" rx="10" fill={teal} />
      <Circle cx="70" cy="30" r="4" fill={accent} />
      <Circle cx="110" cy="30" r="4" fill={accent} />
      <G fill={tealDark} opacity={0.35}>
        <Rect x="60" y="70" width="12" height="10" rx="2" />
        <Rect x="80" y="70" width="12" height="10" rx="2" />
        <Rect x="100" y="70" width="12" height="10" rx="2" />
        <Rect x="60" y="88" width="12" height="10" rx="2" />
        <Rect x="80" y="88" width="12" height="10" rx="2" />
      </G>
    </Svg>
  );
}

export function NotConnectedIllustration({ width = 180, height = 130 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 180 130" fill="none">
      <Ellipse cx="90" cy="116" rx="70" ry="8" fill={soft} />
      <Circle cx="62" cy="70" r="22" fill={teal} opacity={0.25} />
      <Circle cx="118" cy="70" r="22" fill={accent} opacity={0.25} />
      <Path
        d="M78 70h24"
        stroke={ink}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray="4 6"
      />
      <Circle cx="62" cy="70" r="8" fill={teal} />
      <Circle cx="118" cy="70" r="8" fill={accent} />
    </Svg>
  );
}

export function VisitorSilhouette({ size = 80 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <Rect width="80" height="80" rx="16" fill={soft} />
      <Circle cx="40" cy="30" r="14" fill={teal} opacity={0.45} />
      <Path
        d="M18 68c4-16 12-24 22-24s18 8 22 24"
        fill={teal}
        opacity={0.45}
      />
    </Svg>
  );
}
