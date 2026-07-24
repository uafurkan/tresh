'use client';

import { useEffect, useRef } from 'react';

export interface WaterCanvasProps {
  /** 0..1 — su yüzeyinin normalleştirilmiş seviyesi. */
  level: number;
  /** 0..1 — eşik çizgisinin normalleştirilmiş seviyesi. */
  thresholdLevel: number;
  /** 0..1 — eşiğe yakınlık gerilimi; rengi donuktan canlıya taşır. */
  tension: number;
  /** Artan sayaç: her artışta tek seferlik overflow dalgası oynar. */
  overflowTick: number;
  reduced: boolean;
  error: boolean;
  loading: boolean;
  /** Yüzeye tutunan okuma bloğunu konumlandırmak için (px, canvas yüksekliği bazında). */
  onSurfaceY?: (y: number) => void;
  className?: string;
}

/**
 * Prototipteki katmanlı sinüs dalga motorunun birebir taşınmış hali.
 * Su seviyesi canlı kuru, kesikli çizgi eşiği temsil eder; gerilim arttıkça
 * renk canlanır ve dalga frekansı hafif yükselir.
 */
export default function WaterCanvas(props: WaterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const p = useRef(props);
  p.current = props;

  const anim = useRef({ dLevel: null as number | null, dTension: 0, overflow: null as { t0: number } | null, lastTick: props.overflowTick });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0, raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const nextW = Math.max(1, r.width);
      const nextH = Math.max(1, r.height);
      // Alt-piksel titreşimlerinde canvas'ı yeniden ayırma — kasmanın asıl kaynağı.
      if (Math.abs(nextW - W) < 0.5 && Math.abs(nextH - H) < 0.5) return;
      W = nextW; H = nextH;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Nokta dizisi karede bir kez hesaplanır, fill ve stroke aynı diziyi paylaşır.
    const pts: { x: number; y: number }[] = [];
    const wave = (
      baseY: number, amp: number, freq: number, phase: number,
      fill: string | CanvasGradient, stroke: string | null
    ) => {
      pts.length = 0;
      for (let x = 0; x <= W; x += 4) {
        const y = baseY + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.3 + phase * 1.5) * amp * 0.4;
        pts.push({ x, y });
      }
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (const pt of pts) ctx.lineTo(pt.x, pt.y);
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.beginPath();
        pts.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      const { level, thresholdLevel, tension: targetTension, reduced, error, loading, overflowTick, onSurfaceY } = p.current;
      const a = anim.current;

      if (overflowTick !== a.lastTick) {
        a.lastTick = overflowTick;
        if (overflowTick > 0) a.overflow = { t0: performance.now() };
      }

      if (a.dLevel == null) a.dLevel = level;
      a.dLevel += (level - a.dLevel) * 0.06;
      a.dTension += (targetTension - a.dTension) * 0.05;
      const tension = a.dTension;

      const surfaceY = H * (1 - a.dLevel);
      const thrY = H * (1 - thresholdLevel);

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#04090E';
      ctx.fillRect(0, 0, W, H);

      const dull = [34, 118, 126], vivid = [56, 231, 217], amber = [255, 150, 74];
      let cr = dull.map((d, i) => d + (vivid[i] - d) * tension);
      let ovAmt = 0;
      if (a.overflow) {
        const el = (performance.now() - a.overflow.t0) / 1000;
        if (el > 2.8) a.overflow = null;
        else {
          ovAmt = el < 0.35 ? el / 0.35 : Math.max(0, 1 - (el - 0.35) / 2.45);
          ovAmt = Math.max(0, Math.min(1, ovAmt));
        }
      }
      if (ovAmt > 0) cr = cr.map((v, i) => v + (amber[i] - v) * ovAmt);
      if (error) {
        const g = cr[0] * 0.3 + cr[1] * 0.59 + cr[2] * 0.11;
        cr = cr.map((v) => v * 0.4 + g * 0.6 * 0.5);
      }
      const col = (al: number) => `rgba(${cr[0] | 0},${cr[1] | 0},${cr[2] | 0},${al})`;

      const time = reduced || error ? 0 : ts / 1000;
      const speed = 1 + tension * 1.4;
      const amp = loading ? 3 : 5 + tension * 7;

      ctx.save();
      // Eskiden ctx.filter='blur(...)' kullanılıyordu — her karede tüm canvas'ı
      // bulanıklaştırmak pahalı ve kasmaya yol açıyordu. Yükleme hissi artık
      // düşük genlik + düşük opaklıkla veriliyor.
      wave(surfaceY + 10, amp * 0.6, 0.014, time * speed * 0.6 + 2, col(0.16), null);
      const grad = ctx.createLinearGradient(0, surfaceY, 0, H);
      grad.addColorStop(0, col(0.42));
      grad.addColorStop(0.5, `rgba(${(cr[0] * 0.5) | 0},${(cr[1] * 0.5) | 0},${(cr[2] * 0.55) | 0},0.5)`);
      grad.addColorStop(1, 'rgba(6,16,26,0.85)');
      wave(surfaceY, amp, 0.021, time * speed, grad, col(loading ? 0.4 : 0.95));
      ctx.restore();

      ctx.save();
      ctx.setLineDash([2, 7]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = ovAmt > 0.2 ? `rgba(255,150,74,${0.5 + ovAmt * 0.4})` : 'rgba(232,241,245,0.32)';
      ctx.beginPath();
      ctx.moveTo(0, thrY);
      ctx.lineTo(W, thrY);
      ctx.stroke();
      ctx.restore();

      if (a.overflow && !reduced) {
        const el = (performance.now() - a.overflow.t0) / 1000;
        const cx = W * 0.5, cy = thrY;
        const ring = (delay: number) => {
          const e = el - delay;
          if (e < 0 || e > 0.9) return;
          const r = 20 + e * 260;
          const al = Math.max(0, 1 - e / 0.9) * 0.5;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255,150,74,${al})`;
          ctx.lineWidth = 2.5 * (1 - e);
          ctx.stroke();
        };
        ring(0);
        ring(0.18);
      }

      onSurfaceY?.(surfaceY);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className={props.className} style={{ display: 'block', width: '100%', height: '100%' }} aria-hidden="true" />;
}
