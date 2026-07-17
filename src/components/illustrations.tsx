import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { Brand, Pastels } from '@/constants/theme';

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
const ink = '#9AAFA7';

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
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <Circle cx="40" cy="40" r="38" fill={soft} />
      <Circle cx="40" cy="32" r="14" fill={sage} opacity={0.55} />
      <Path
        d="M18 68c4-16 12-24 22-24s18 8 22 24"
        fill={sage}
        opacity={0.45}
      />
    </Svg>
  );
}
