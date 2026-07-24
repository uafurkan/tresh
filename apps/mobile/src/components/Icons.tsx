import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../lib/theme';

/**
 * Web'deki (TreshApp.tsx) SVG ikonlarının birebir aynısı — aynı viewBox,
 * aynı path verisi, aynı stroke kalınlıkları. Mobilde önceden metin
 * karakterleri (▶, ❚❚, ✕, 🔔) kullanılıyordu; iki platformun görsel dili
 * ayrışmasın diye gerçek ikonlarla değiştirildi.
 */

interface IconProps {
  size?: number;
  color?: string;
}

/** Duraklat — iki dikey çubuk (web: fill="currentColor"). */
export function PauseIcon({ size = 12, color = COLORS.contentSecondary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 4h4v16H6zm8 0h4v16h-4z" fill={color} />
    </Svg>
  );
}

/** Devam et — üçgen. */
export function PlayIcon({ size = 12, color = COLORS.contentSecondary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 4l14 8-14 8V4z" fill={color} />
    </Svg>
  );
}

/** Sil — çarpı. */
export function CloseIcon({ size = 12, color = COLORS.contentSecondary, strokeWidth = 2 }: IconProps & { strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 5l14 14M19 5L5 19" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Bildirimler — çan. */
export function BellIcon({ size = 16, color = COLORS.contentSecondary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 16v-5a6 6 0 1 0-12 0v5l-1.6 2.4A1 1 0 0 0 5.24 20h13.52a1 1 0 0 0 .84-1.6L18 16Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M10 21a2 2 0 0 0 4 0" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

/** Döviz çevirici — çift yönlü ok (web: CurrencyConverter takas düğmesi). */
export function SwapIcon({ size = 15, color = COLORS.contentSecondary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 10h13l-4-4M17 14H4l4 4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Geri — sol chevron. */
export function ChevronLeftIcon({ size = 18, color = COLORS.contentSecondary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Aşağı chevron — açılır liste göstergesi. */
export function ChevronDownIcon({ size = 12, color = COLORS.contentSecondary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Yukarı chevron. */
export function ChevronUpIcon({ size = 12, color = COLORS.contentSecondary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 15l-6-6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
