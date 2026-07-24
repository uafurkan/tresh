import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

export interface WaterBackgroundProps {
  /** 0..1 — su yüzeyinin normalleştirilmiş seviyesi. */
  level: number;
  /** 0..1 — eşik çizgisinin normalleştirilmiş seviyesi. */
  thresholdLevel: number;
  /** 0..1 — eşiğe yakınlık gerilimi; rengi donuktan canlıya taşır. */
  tension: number;
  /** Artan sayaç: her artışta tek seferlik overflow dalgası oynar. */
  overflowTick: number;
  reduced?: boolean;
  error?: boolean;
  loading?: boolean;
  width: number;
  height: number;
  onSurfaceY?: (y: number) => void;
  /** Su terazisi efekti: cihaz eğimine ters yönde derece cinsinden dönüş. */
  tiltDeg?: number;
}

const DULL: [number, number, number] = [34, 118, 126];
const VIVID: [number, number, number] = [56, 231, 217];
const AMBER: [number, number, number] = [255, 150, 74];

function waveY(x: number, baseY: number, amp: number, freq: number, phase: number): number {
  return baseY + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.3 + phase * 1.5) * amp * 0.4;
}

function wavePathD(x0: number, x1: number, baseY: number, amp: number, freq: number, phase: number, bottomY: number): string {
  const parts: string[] = [`M${x0.toFixed(1)},${bottomY.toFixed(1)}`];
  for (let x = x0; x <= x1; x += 6) parts.push(`L${x.toFixed(1)},${waveY(x, baseY, amp, freq, phase).toFixed(1)}`);
  parts.push(`L${x1.toFixed(1)},${bottomY.toFixed(1)} Z`);
  return parts.join(' ');
}

function waveStrokeD(x0: number, x1: number, baseY: number, amp: number, freq: number, phase: number): string {
  const parts: string[] = [];
  for (let x = x0; x <= x1; x += 6) {
    const y = waveY(x, baseY, amp, freq, phase).toFixed(1);
    parts.push(`${x === x0 ? 'M' : 'L'}${x.toFixed(1)},${y}`);
  }
  return parts.join(' ');
}

/**
 * Web'deki WaterCanvas.tsx'in (HTML5 Canvas, requestAnimationFrame) SVG ile
 * taşınmış hali — aynı iki katmanlı sinüs dalga motoru, aynı gerilim-bazlı
 * (donuk -> canlı) renk enterpolasyonu, aynı kesikli eşik çizgisi, aynı
 * overflow halka animasyonu. react-native-svg kullanır (Skia yerine) —
 * Expo Go dahil her ortamda ekstra native derleme gerektirmeden çalışır.
 */
export default function WaterBackground({
  level, thresholdLevel, tension: targetTension, overflowTick, reduced, error, loading, width: W, height: H, onSurfaceY, tiltDeg = 0,
}: WaterBackgroundProps) {
  const [, force] = useState(0);
  const anim = useRef({
    dLevel: level,
    dTension: 0,
    overflow: null as { t0: number } | null,
    lastTick: overflowTick,
    startTs: Date.now(),
  });

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const a = anim.current;
      if (overflowTick !== a.lastTick) {
        a.lastTick = overflowTick;
        if (overflowTick > 0) a.overflow = { t0: Date.now() };
      }
      a.dLevel += (level - a.dLevel) * 0.06;
      a.dTension += (targetTension - a.dTension) * 0.05;
      if (a.overflow && Date.now() - a.overflow.t0 > 2800) a.overflow = null;
      force((n) => n + 1);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, targetTension, overflowTick]);

  if (W <= 0 || H <= 0) return null;

  const a = anim.current;
  const tension = a.dTension;
  const surfaceY = H * (1 - a.dLevel);
  const thrY = H * (1 - thresholdLevel);
  // DİKKAT: onSurfaceY'yi burada (render gövdesinde) senkron çağırmak
  // "Cannot update a component while rendering a different component"
  // hatasına yol açıyordu — React 19'da bu saniyede 60 kez tetiklenince
  // beyaz ekran çökmesine dönüşüyordu. useEffect'e taşındı (render sonrası).
  useEffect(() => {
    onSurfaceY?.(surfaceY);
  });

  let cr: [number, number, number] = [
    DULL[0] + (VIVID[0] - DULL[0]) * tension,
    DULL[1] + (VIVID[1] - DULL[1]) * tension,
    DULL[2] + (VIVID[2] - DULL[2]) * tension,
  ];
  let ovAmt = 0;
  if (a.overflow) {
    const el = (Date.now() - a.overflow.t0) / 1000;
    ovAmt = el < 0.35 ? el / 0.35 : Math.max(0, 1 - (el - 0.35) / 2.45);
    ovAmt = Math.max(0, Math.min(1, ovAmt));
  }
  if (ovAmt > 0) cr = cr.map((v, i) => v + (AMBER[i] - v) * ovAmt) as [number, number, number];
  if (error) {
    const g = cr[0] * 0.3 + cr[1] * 0.59 + cr[2] * 0.11;
    cr = cr.map((v) => v * 0.4 + g * 0.6 * 0.5) as [number, number, number];
  }
  const col = (al: number) => `rgba(${cr[0] | 0},${cr[1] | 0},${cr[2] | 0},${al})`;

  const now = Date.now();
  const time = reduced || error ? 0 : (now - a.startTs) / 1000;
  const speed = 1 + tension * 1.4;
  const amp = loading ? 3 : 5 + tension * 7;

  // Terazi rotasyonu (G) su gövdesini ekranın kenarları etrafında döndürür;
  // suyu tam W/H sınırlarında çizersek dönünce köşelerde düz arka planın
  // göründüğü boş üçgenler kalır. Suyu ekranın biraz dışına taşacak kadar
  // geniş/derin çiziyoruz — Svg zaten kendi sınırlarına göre kırpıyor.
  const PAD_X = W * 0.4;
  const PAD_BOTTOM = H * 0.3;
  const washFillD = wavePathD(-PAD_X, W + PAD_X, surfaceY + 10, amp * 0.6, 0.014, time * speed * 0.6 + 2, H + PAD_BOTTOM);
  const mainFillD = wavePathD(-PAD_X, W + PAD_X, surfaceY, amp, 0.021, time * speed, H + PAD_BOTTOM);
  const mainStrokeD = waveStrokeD(-PAD_X, W + PAD_X, surfaceY, amp, 0.021, time * speed);
  const thrColor = ovAmt > 0.2 ? `rgba(255,150,74,${0.5 + ovAmt * 0.4})` : 'rgba(232,241,245,0.32)';

  return (
    <View style={{ width: W, height: H }}>
      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id="waterGrad" x1={0} y1={surfaceY} x2={0} y2={H} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={col(0.42)} />
            <Stop offset="0.5" stopColor={`rgba(${(cr[0] * 0.5) | 0},${(cr[1] * 0.5) | 0},${(cr[2] * 0.55) | 0},0.5)`} />
            <Stop offset="1" stopColor="rgba(6,16,26,0.85)" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={H} fill="#04090E" />
        {/* Su terazisi: sıvı gövdesi, gerçek bir terazideki gibi cihaz
            eğimine karşı yüzey merkezinden döner; eşik çizgisi cihaza
            sabit kalır (dünyaya değil telefona göre), tıpkı üzerinde
            işaret olan bir kaba bakar gibi. */}
        <G rotation={tiltDeg} origin={`${W / 2}, ${surfaceY}`}>
          <Path d={washFillD} fill={col(0.16)} />
          <Path d={mainFillD} fill="url(#waterGrad)" />
          <Path d={mainStrokeD} fill="none" stroke={col(loading ? 0.4 : 0.95)} strokeWidth={2} />
        </G>
        <Path d={`M0,${thrY.toFixed(1)} L${W},${thrY.toFixed(1)}`} stroke={thrColor} strokeWidth={1.5} strokeDasharray="2 7" />
        {a.overflow && !reduced && [0, 0.18].map((delay) => {
          const el = (now - a.overflow!.t0) / 1000 - delay;
          if (el < 0 || el > 0.9) return null;
          const r = 20 + el * 260;
          const al = Math.max(0, 1 - el / 0.9) * 0.5;
          return (
            <Circle key={delay} cx={W * 0.5} cy={thrY} r={r} fill="none" stroke={`rgba(255,150,74,${al})`} strokeWidth={2.5 * (1 - el)} />
          );
        })}
      </Svg>
    </View>
  );
}
