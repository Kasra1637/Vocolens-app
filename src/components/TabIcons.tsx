/**
 * Custom tab bar icons for Mic, BarChart, BookOpen, Award, and Settings.
 * All icons use the same pattern: toggling between filled and outline states
 * while keeping the exact same visual shape in both states.
 */

import React from 'react';
import Svg, { Path, Rect, Line, Circle } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  filled?: boolean;
}

/** Microphone — same capsule+stand shape, toggled fill */
export function MicTabIcon({ size = 22, color = '#FFFFFF', filled = false }: IconProps) {
  const sw = filled ? 0 : 1.6;
  const fill = filled ? color : 'none';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Capsule body */}
      <Path
        d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"
        fill={fill}
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Outer arc */}
      <Path
        d="M19 10v2a7 7 0 0 1-14 0v-2"
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      {/* Stand */}
      <Line x1="12" y1="19" x2="12" y2="22" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      {/* Base */}
      <Line x1="8"  y1="22" x2="16" y2="22" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

/** Bar chart — three solid-width rectangles, toggled fill */
export function BarChartTabIcon({ size = 22, color = '#FFFFFF', filled = false }: IconProps) {
  const sw = filled ? 0 : 1.6;
  const fill = filled ? color : 'none';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Left bar — short */}
      <Rect
        x="2.5" y="14" width="5" height="7" rx="1.2"
        fill={fill} stroke={color} strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* Center bar — tall */}
      <Rect
        x="9.5" y="5" width="5" height="16" rx="1.2"
        fill={fill} stroke={color} strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* Right bar — medium */}
      <Rect
        x="16.5" y="9" width="5" height="12" rx="1.2"
        fill={fill} stroke={color} strokeWidth={sw}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Open book — two pages toggle fill, spine curve always visible */
export function BookTabIcon({ size = 22, color = '#FFFFFF', filled = false }: IconProps) {
  const sw = filled ? 0 : 1.6;
  const fillC = filled ? color : 'none';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Left page */}
      <Path
        d="M2 5a2 2 0 0 1 2-2h6v15H4a2 2 0 0 1-2-2V5Z"
        fill={fillC} stroke={color} strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* Right page */}
      <Path
        d="M22 5a2 2 0 0 0-2-2h-6v15h6a2 2 0 0 0 2-2V5Z"
        fill={fillC} stroke={color} strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* Spine curve at bottom — always visible */}
      <Path
        d="M10 18 Q12 21 14 18"
        fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round"
      />
    </Svg>
  );
}

/** Trophy — cup body toggles fill, handles/stem/base always stroke */
export function AwardTabIcon({ size = 22, color = '#FFFFFF', filled = false }: IconProps) {
  const sw = filled ? 0 : 1.6;
  const fillC = filled ? color : 'none';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Cup body */}
      <Path
        d="M7 2h10v9a5 5 0 0 1-10 0V2Z"
        fill={fillC} stroke={color} strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* Left handle — always stroke */}
      <Path
        d="M7 4H4a2 2 0 0 0 0 4h3"
        fill="none" stroke={color} strokeWidth={1.6}
        strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Right handle — always stroke */}
      <Path
        d="M17 4h3a2 2 0 0 1 0 4h-3"
        fill="none" stroke={color} strokeWidth={1.6}
        strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Stem — always stroke */}
      <Line x1="12" y1="16" x2="12" y2="20" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      {/* Base — always stroke */}
      <Line x1="8" y1="20" x2="16" y2="20" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

/** Settings sliders — three lines always stroke, knobs toggle fill */
export function SettingsTabIcon({ size = 22, color = '#FFFFFF', filled = false }: IconProps) {
  const sw = filled ? 0 : 1.6;
  const fillC = filled ? color : 'none';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Top line */}
      <Line x1="3" y1="6" x2="21" y2="6" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      {/* Middle line */}
      <Line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      {/* Bottom line */}
      <Line x1="3" y1="18" x2="21" y2="18" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      {/* Top knob */}
      <Circle cx="15" cy="6" r="2.8" fill={fillC} stroke={color} strokeWidth={sw} />
      {/* Middle knob */}
      <Circle cx="9" cy="12" r="2.8" fill={fillC} stroke={color} strokeWidth={sw} />
      {/* Bottom knob */}
      <Circle cx="15" cy="18" r="2.8" fill={fillC} stroke={color} strokeWidth={sw} />
    </Svg>
  );
}
