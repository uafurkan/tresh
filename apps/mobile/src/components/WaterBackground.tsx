import { useEffect, useRef, useState } from 'react';
import { Canvas, Fill, Path, Skia, LinearGradient, vec, DashPathEffect, Group, Circle, type SkPath } from '@shopify/react-native-skia';

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
}

const DULL: [number, number, number] = [34, 118, 126];
const VIVID: [number, number, number] = [56, 231, 217];
const AMBER: [number, number, number] = [255, 150, 74];

function wavePath(W: number, baseY: number, amp: number, freq: number, phase: number, H: number): SkPath {
  const path = Skia.Path.Make();
  path.moveTo(0, H);
  for (let x = 0; x <= W; x += 6) {
    const y = baseY + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.3 + phase * 1.5) * amp * 0.4;
    path.lineTo(x, y);
  }
  path.lineTo(W, H);
  path.close();
  return path;
}

function waveStroke(W: number, baseY: number, amp: number, freq: number, phase: number): SkPath {
  const path = Skia.Path.Make();
  for (let x = 0; x <= W; x += 6) {
    const y = baseY + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.3 + phase * 1.5) * amp * 0.4;
    if (x === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  return path;
}

/**
 * Web'deki WaterCanvas.tsx'in (HTML5 Canvas, requestAnimationFrame) Skia ile
 * birebir taşınmış hali — aynı iki katmanlı sinüs dalga motoru, aynı
 * gerilim-bazlı renk enterpolasyonu, aynı eşik çizgisi ve overflow halkaları.
 */
export default function WaterBackground({
  level, thresholdLevel, tension: targetTension, overflowTick, reduced, error, loading, width: W, height: H, onSurfaceY,
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
  onSurfaceY?.(surfaceY);

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

  const washFill = wavePath(W, surfaceY + 10, amp * 0.6, 0.014, time * speed * 0.6 + 2, H);
  const mainFill = wavePath(W, surfaceY, amp, 0.021, time * speed, H);
  const mainStroke = waveStroke(W, surfaceY, amp, 0.021, time * speed);

  const thrLine = Skia.Path.Make();
  thrLine.moveTo(0, thrY);
  thrLine.lineTo(W, thrY);
  const thrColor = ovAmt > 0.2 ? `rgba(255,150,74,${0.5 + ovAmt * 0.4})` : 'rgba(232,241,245,0.32)';

  return (
    <Canvas style={{ width: W, height: H }}>
      <Fill color="#04090E" />
      <Path path={washFill} color={col(0.16)} />
      <Path path={mainFill}>
        <LinearGradient
          start={vec(0, surfaceY)}
          end={vec(0, H)}
          colors={[col(0.42), `rgba(${(cr[0] * 0.5) | 0},${(cr[1] * 0.5) | 0},${(cr[2] * 0.55) | 0},0.5)`, 'rgba(6,16,26,0.85)']}
          positions={[0, 0.5, 1]}
        />
      </Path>
      <Path path={mainStroke} style="stroke" strokeWidth={2} color={col(loading ? 0.4 : 0.95)} />
      <Path path={thrLine} style="stroke" strokeWidth={1.5} color={thrColor}>
        <DashPathEffect intervals={[2, 7]} />
      </Path>
      {a.overflow && !reduced && (
        <Group>
          {[0, 0.18].map((delay) => {
            const el = (now - a.overflow!.t0) / 1000 - delay;
            if (el < 0 || el > 0.9) return null;
            const r = 20 + el * 260;
            const al = Math.max(0, 1 - el / 0.9) * 0.5;
            return (
              <Circle key={delay} cx={W * 0.5} cy={thrY} r={r} style="stroke" strokeWidth={2.5 * (1 - el)} color={`rgba(255,150,74,${al})`} />
            );
          })}
        </Group>
      )}
    </Canvas>
  );
}
