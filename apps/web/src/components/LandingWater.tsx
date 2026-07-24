'use client';

import { useEffect, useState } from 'react';
import WaterCanvas from '@/components/WaterCanvas';

/** Landing için sakin, düşük gerilimli dekoratif su. */
export default function LandingWater() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    try {
      setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch { /* eski tarayıcı */ }
  }, []);
  return (
    <div className="absolute inset-0">
      <WaterCanvas
        level={0.32}
        thresholdLevel={0.55}
        tension={0.15}
        overflowTick={0}
        reduced={reduced}
        error={false}
        loading={false}
      />
    </div>
  );
}
