'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import WaterCanvas from '@/components/WaterCanvas';
import { PAIR_CATALOG, pairKey, type Threshold } from '@/lib/pairs';
import { localRepository } from '@/lib/client/storage';
import { enablePush, pushSupported, registerServiceWorker, syncThresholds } from '@/lib/client/push';
import { useRates } from '@/lib/client/useRates';

type Screen = 'home' | 'set';

const cataloguePairs = PAIR_CATALOG.map((p) => pairKey(p.base, p.quote));

function tensionOf(rate: number, value: number, span: number): number {
  return Math.max(0, Math.min(1, 1 - Math.abs(rate - value) / (span * 0.5)));
}

function miniWavePath(level: number, w: number, h: number): string {
  const midY = h * (1 - level) * 0.7 + h * 0.15;
  const parts: string[] = [];
  for (let x = 0; x <= w; x += 4) parts.push(`${x === 0 ? 'M' : 'L'}${x} ${(midY + Math.sin(x * 0.28) * 2.2).toFixed(1)}`);
  return parts.join(' ');
}

export default function TreshApp() {
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [banner, setBanner] = useState<string | null>(null);
  const [overflowTick, setOverflowTick] = useState(0);
  const [reduced, setReduced] = useState(false);

  // set-flow state
  const [newPairIdx, setNewPairIdx] = useState(0);
  const [newDir, setNewDir] = useState<'above' | 'below'>('above');
  const [newValue, setNewValue] = useState<number | null>(null);
  const [perm, setPerm] = useState(false);
  const [permBusy, setPermBusy] = useState(false);

  useEffect(() => {
    const loaded = localRepository.load();
    setThresholds(loaded);
    setSelectedId(loaded[0]?.id ?? null);
    setHydrated(true);
    registerServiceWorker();
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') setPerm(true);
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReduced(mq.matches);
      const on = (e: MediaQueryListEvent) => setReduced(e.matches);
      mq.addEventListener('change', on);
      return () => mq.removeEventListener('change', on);
    } catch { /* eski tarayıcı */ }
  }, []);

  const watchedPairs = useMemo(() => {
    const set = new Set(thresholds.map((t) => pairKey(t.base, t.quote)));
    const selPair = pairKey(PAIR_CATALOG[newPairIdx].base, PAIR_CATALOG[newPairIdx].quote);
    set.add(selPair);
    if (set.size === 0) set.add('USD/TRY');
    return [...set];
  }, [thresholds, newPairIdx]);

  const { rates, error, loading, retry } = useRates(hydrated ? watchedPairs : []);

  const persist = useCallback((next: Threshold[]) => {
    setThresholds(next);
    localRepository.save(next);
    syncThresholds(next);
  }, []);

  const selected = thresholds.find((t) => t.id === selectedId) ?? thresholds[0] ?? null;
  const selectedCatalog = selected ? PAIR_CATALOG.find((p) => p.base === selected.base && p.quote === selected.quote) : null;
  const selectedRate = selected ? rates[pairKey(selected.base, selected.quote)] : undefined;

  // Geçiş tespiti (istemci tarafı — açıkken banner + overflow animasyonu)
  const prevRates = useRef<Record<string, number>>({});
  useEffect(() => {
    for (const t of thresholds) {
      if (t.paused) continue;
      const key = pairKey(t.base, t.quote);
      const cur = rates[key]?.rate;
      if (cur == null) continue;
      const prev = prevRates.current[t.id];
      if (prev != null) {
        const crossed = t.dir === 'above' ? prev < t.value && cur >= t.value : prev > t.value && cur <= t.value;
        if (crossed) {
          setBanner(`${key} ${t.value.toFixed(t.decimals)} seviyesini ${t.dir === 'above' ? 'geçti' : 'aşağı kırdı'} — şu an ${cur.toFixed(t.decimals)}.`);
          setOverflowTick((n) => n + 1);
          window.setTimeout(() => setBanner(null), 6000);
        }
      }
      prevRates.current[t.id] = cur;
    }
  }, [rates, thresholds]);

  // ---- Su geometrisi ----
  const span = selectedCatalog?.span ?? 1;
  const center = selected ? selected.value : selectedRate?.rate ?? 0;
  const min = center - span / 2;
  const clamp01 = (v: number) => Math.max(0.06, Math.min(0.94, v));
  const level = selectedRate ? clamp01((selectedRate.rate - min) / span) : 0.42;
  const thrLevel = selected ? clamp01((selected.value - min) / span) : 0.62;
  const tension = selected && selectedRate ? tensionOf(selectedRate.rate, selected.value, span) : 0;

  const [surfaceY, setSurfaceY] = useState(300);
  const onSurfaceY = useCallback((y: number) => {
    setSurfaceY((prev) => (Math.abs(prev - y) > 0.5 ? y : prev));
  }, []);

  // ---- set flow helpers ----
  const setCat = PAIR_CATALOG[newPairIdx];
  const setPairKeyStr = pairKey(setCat.base, setCat.quote);
  const setLive = rates[setPairKeyStr]?.rate ?? null;
  const setMin = (setLive ?? 0) - setCat.span / 2;
  const effNewValue = newValue ?? (setLive != null ? setLive + setCat.span * 0.15 * (newDir === 'above' ? 1 : -1) : null);
  const fillPct = setLive != null && effNewValue != null ? Math.max(0, Math.min(100, ((effNewValue - setMin) / setCat.span) * 100)) : 50;
  const floatTop = 100 - fillPct;

  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const onTrackMove = useCallback((clientY: number) => {
    const el = trackRef.current;
    if (!el || setLive == null) return;
    const r = el.getBoundingClientRect();
    const p01 = Math.max(0, Math.min(1, (clientY - r.top) / r.height));
    setNewValue(setMin + (1 - p01) * setCat.span);
  }, [setLive, setMin, setCat.span]);

  useEffect(() => {
    const move = (e: PointerEvent) => { if (dragging.current) onTrackMove(e.clientY); };
    const up = () => { dragging.current = false; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [onTrackMove]);

  const createThreshold = () => {
    if (effNewValue == null) return;
    const t: Threshold = {
      id: 't' + Date.now(),
      base: setCat.base,
      quote: setCat.quote,
      decimals: setCat.decimals,
      value: +effNewValue.toFixed(setCat.decimals),
      dir: newDir,
      paused: false,
      createdAt: Date.now(),
    };
    const next = [...thresholds, t];
    persist(next);
    setSelectedId(t.id);
    setScreen('home');
    setNewValue(null);
  };

  const togglePerm = async () => {
    if (perm || permBusy) return;
    setPermBusy(true);
    const ok = await enablePush(thresholds);
    setPerm(ok);
    setPermBusy(false);
  };

  const togglePause = (id: string) => {
    persist(thresholds.map((t) => (t.id === id ? { ...t, paused: !t.paused } : t)));
  };
  const removeThreshold = (id: string) => {
    const next = thresholds.filter((t) => t.id !== id);
    persist(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
  };

  const activeCount = thresholds.filter((t) => !t.paused).length;
  const isEmpty = hydrated && thresholds.length === 0;

  // ---- render parçaları ----
  const readoutTop = Math.max(120, Math.min(surfaceY - 150, 420));

  const listItems = thresholds.map((t) => {
    const key = pairKey(t.base, t.quote);
    const live = rates[key]?.rate;
    const cat = PAIR_CATALOG.find((p) => p.base === t.base && p.quote === t.quote)!;
    const tens = live != null ? tensionOf(live, t.value, cat.span) : 0;
    const dist = live != null ? Math.abs(live - t.value) : null;
    let color: string, status: string, statusColor: string;
    if (t.paused) {
      color = '#5f7585'; status = 'Susturuldu'; statusColor = '#5f7585';
    } else {
      const dull = [46, 164, 160], vivid = [56, 231, 217];
      color = `rgb(${dull.map((d, i) => Math.round(d + (vivid[i] - d) * tens)).join(',')})`;
      status = tens > 0.72 ? 'Yaklaşıyor' : tens > 0.4 ? 'İzleniyor' : 'Sakin';
      statusColor = tens > 0.72 ? '#FF9647' : '#8FA5B3';
    }
    const lvlCenter = t.value;
    const lvl = live != null ? Math.max(0, Math.min(1, (live - (lvlCenter - cat.span / 2)) / cat.span)) : 0.5;
    const markLvl = 0.5;
    const selectedItem = t.id === selectedId;
    return { t, key, live, color, status, statusColor, dist, lvl, markLvl, selectedItem };
  });

  const waterPanel = (
    <div className="absolute inset-0">
      <WaterCanvas
        level={level}
        thresholdLevel={thrLevel}
        tension={tension}
        overflowTick={overflowTick}
        reduced={reduced}
        error={error}
        loading={loading || !hydrated}
        onSurfaceY={onSurfaceY}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(140% 55% at 50% 118%, rgba(5,11,20,0) 30%, rgba(5,11,20,0.85) 100%), linear-gradient(180deg, rgba(5,11,20,0.55) 0%, rgba(5,11,20,0) 22%)',
        }}
      />
      {/* yüzeye tutunan kur okuması */}
      <div
        className="pointer-events-none absolute left-0 right-0 text-center transition-transform"
        style={{ top: 0, transform: `translateY(${readoutTop}px)`, willChange: 'transform' }}
      >
        <div className="num mb-1.5 text-xs uppercase tracking-[2px] text-content-secondary">
          {selected ? pairKey(selected.base, selected.quote) : setPairKeyStr}
        </div>
        <div
          className="num text-content-primary"
          style={{ fontSize: 'clamp(44px, 8vw, 86px)', fontWeight: 400, letterSpacing: '-1.5px', lineHeight: 1, textShadow: '0 2px 30px rgba(5,11,20,0.9)' }}
        >
          {loading && !selectedRate ? '· · ·' : (selected ? selectedRate?.rate : setLive)?.toFixed(selected?.decimals ?? setCat.decimals) ?? '—'}
        </div>
        {selected && selectedRate && (
          <div className="num mt-2 text-[13px] text-content-secondary">
            {`${selectedRate.rate - selectedRate.opening >= 0 ? '+' : ''}${(selectedRate.rate - selectedRate.opening).toFixed(selected.decimals)} bugün · ${selected.dir === 'above' ? 'üstü' : 'altı'} ${selected.value.toFixed(selected.decimals)}`}
          </div>
        )}
      </div>
      {/* hata durumu: sakin, olgusal */}
      {error && (
        <div className="absolute left-4 right-4 top-[118px] z-10 md:left-12 md:right-auto md:max-w-md">
          <div className="rounded-2xl border border-content-secondary/20 bg-bg-surface/70 p-4 backdrop-blur-md">
            <div className="mb-0.5 text-sm text-content-primary">Sinyal kesildi</div>
            <div className="mb-3 text-[13px] leading-relaxed text-content-secondary">
              Kurlar duraklatıldı — son okuma tutuluyor. Bağlantı gelir gelmez kaldığımız yerden süreceğiz.
            </div>
            <button
              onClick={retry}
              className="rounded-xl border border-water/40 bg-water/15 px-4 py-2 text-[13px] text-water"
            >
              Yeniden bağlan
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const listPanel = (
    <>
      {isEmpty && screen === 'home' && (
        <div className="rise-in px-5 pb-2 pt-6 text-center">
          <div className="mb-2 font-heading text-[22px] leading-snug text-content-primary">Durgun su.</div>
          <div className="mx-auto mb-1 max-w-[280px] text-sm leading-relaxed text-content-secondary">
            İlk eşiğini kur; seviyeyi senin yerine biz izleyelim — sen uzaktayken bile.
          </div>
        </div>
      )}
      {thresholds.length > 0 && (
        <div className="mb-3.5 flex flex-col gap-2">
          {listItems.map(({ t, key, live, color, status, statusColor, dist, lvl, markLvl, selectedItem }) => (
            <div
              key={t.id}
              className="flex items-center gap-3.5 rounded-2xl border p-3 transition-all duration-200"
              style={{
                background: selectedItem ? 'rgba(18,34,54,0.9)' : 'rgba(11,22,34,0.6)',
                borderColor: selectedItem ? 'rgba(52,227,214,0.4)' : 'rgba(143,165,179,0.14)',
                opacity: t.paused ? 0.55 : 1,
              }}
            >
              <button onClick={() => setSelectedId(t.id)} className="flex min-w-0 flex-1 items-center gap-3.5 text-left">
                <svg width="60" height="26" viewBox="0 0 60 26" className="flex-none overflow-visible">
                  <path d={miniWavePath(lvl, 60, 26)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
                  <line x1="0" y1={(26 * (1 - markLvl) * 0.7 + 26 * 0.15).toFixed(1)} x2="60" y2={(26 * (1 - markLvl) * 0.7 + 26 * 0.15).toFixed(1)} stroke={color} strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
                </svg>
                <span className="min-w-0 flex-1">
                  <span className="num block text-sm tracking-wide text-content-primary">{key}</span>
                  <span className="mt-0.5 block text-xs text-content-secondary">
                    {t.dir === 'above' ? 'Üstü' : 'Altı'} {t.value.toFixed(t.decimals)}
                    {!t.paused && dist != null ? ` · ${dist.toFixed(t.decimals)} uzakta` : ''}
                  </span>
                </span>
                <span className="flex-none text-right">
                  <span className="num block text-sm" style={{ color }}>{live?.toFixed(t.decimals) ?? '—'}</span>
                  <span className="mt-0.5 block text-[11px]" style={{ color: statusColor }}>{status}</span>
                </span>
              </button>
              <div className="flex flex-none flex-col gap-1">
                <button
                  onClick={() => togglePause(t.id)}
                  aria-label={t.paused ? 'İzlemeyi sürdür' : 'Sustur'}
                  title={t.paused ? 'İzlemeyi sürdür' : 'Sustur'}
                  className="rounded-lg px-1.5 py-0.5 text-[11px] text-content-secondary hover:bg-bg-raised"
                >
                  {t.paused ? '▸' : '⏸'}
                </button>
                <button
                  onClick={() => removeThreshold(t.id)}
                  aria-label="Eşiği sil"
                  title="Eşiği sil"
                  className="rounded-lg px-1.5 py-0.5 text-[13px] text-content-secondary hover:bg-bg-raised"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => { setScreen('set'); setNewValue(null); }}
        className="w-full rounded-[20px] bg-water p-4 text-base font-semibold text-[#04121a]"
        style={{ boxShadow: '0 16px 40px -14px rgba(52,227,214,0.6)' }}
      >
        Eşik belirle
      </button>
    </>
  );

  const setPanel = (
    <div className="flex h-full flex-col">
      <div className="mb-1 font-heading text-[26px] leading-tight text-content-primary">Çizgin nerede?</div>
      <div className="mb-5 text-sm leading-normal text-content-secondary">Şamandırayı önemsediğin seviyeye sürükle.</div>

      <div className="mb-2 text-[11px] uppercase tracking-[1.5px] text-content-secondary">Parite</div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {PAIR_CATALOG.map((p, i) => {
          const on = i === newPairIdx;
          return (
            <button
              key={pairKey(p.base, p.quote)}
              onClick={() => { setNewPairIdx(i); setNewValue(null); }}
              className="num rounded-xl border px-1.5 py-2.5 text-[13px] transition-all"
              style={{
                background: on ? 'rgba(52,227,214,0.14)' : 'rgba(11,22,34,0.5)',
                borderColor: on ? 'rgba(52,227,214,0.5)' : 'rgba(143,165,179,0.16)',
                color: on ? '#34E3D6' : '#8FA5B3',
              }}
            >
              {p.base}/{p.quote}
            </button>
          );
        })}
      </div>

      <div className="mb-2 text-[11px] uppercase tracking-[1.5px] text-content-secondary">Haber ver, kur</div>
      <div className="mb-5 flex gap-2">
        {(['above', 'below'] as const).map((d) => {
          const on = newDir === d;
          return (
            <button
              key={d}
              onClick={() => setNewDir(d)}
              className="flex-1 rounded-xl border p-3 text-sm transition-all"
              style={{
                background: on ? 'rgba(52,227,214,0.14)' : 'rgba(11,22,34,0.5)',
                borderColor: on ? 'rgba(52,227,214,0.5)' : 'rgba(143,165,179,0.16)',
                color: on ? '#34E3D6' : '#8FA5B3',
              }}
            >
              {d === 'above' ? 'Üstüne çıkarsa' : 'Altına düşerse'}
            </button>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1 items-stretch gap-5">
        <div
          ref={trackRef}
          onPointerDown={(e) => { dragging.current = true; onTrackMove(e.clientY); }}
          role="slider"
          aria-label="Eşik değeri"
          aria-valuemin={setMin}
          aria-valuemax={setMin + setCat.span}
          aria-valuenow={effNewValue ?? undefined}
          tabIndex={0}
          onKeyDown={(e) => {
            if (setLive == null || effNewValue == null) return;
            const step = setCat.span / 100;
            if (e.key === 'ArrowUp') setNewValue(Math.min(setMin + setCat.span, effNewValue + step));
            if (e.key === 'ArrowDown') setNewValue(Math.max(setMin, effNewValue - step));
          }}
          className="relative w-[76px] flex-none cursor-ns-resize overflow-hidden rounded-[22px] border border-content-secondary/15 md:w-[92px]"
          style={{ background: 'linear-gradient(180deg,#0B1622,#122236)', touchAction: 'none', minHeight: 180 }}
        >
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              height: `${fillPct}%`,
              background: 'linear-gradient(180deg,rgba(52,227,214,0.28),rgba(52,227,214,0.10))',
              borderTop: '1.5px solid rgba(52,227,214,0.7)',
              transition: 'height 60ms linear',
            }}
          />
          <div
            className="absolute left-2 right-2 flex h-[34px] items-center justify-center rounded-xl bg-water"
            style={{ top: `${floatTop}%`, transform: 'translateY(-50%)', boxShadow: '0 8px 24px -6px rgba(52,227,214,0.7)', transition: 'top 60ms linear' }}
          >
            <div className="h-[3px] w-[22px] rounded-sm" style={{ background: 'rgba(4,18,26,0.4)' }} />
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-center">
          <div className="mb-1.5 text-[11px] uppercase tracking-[1.5px] text-content-secondary">Eşik</div>
          <div className="num text-content-primary" style={{ fontSize: 'clamp(36px, 6vw, 52px)', fontWeight: 500, lineHeight: 1 }}>
            {effNewValue != null ? effNewValue.toFixed(setCat.decimals) : '· · ·'}
          </div>
          <div className="mt-2 text-[13px] leading-relaxed text-content-secondary">
            {setLive != null && effNewValue != null
              ? `Şu an ${setLive.toFixed(setCat.decimals)}. ${
                  newDir === 'above'
                    ? effNewValue > setLive
                      ? `Tırmanacak ${(effNewValue - setLive).toFixed(setCat.decimals)} var.`
                      : 'Zaten üstünde.'
                    : effNewValue < setLive
                      ? `Düşecek ${(setLive - effNewValue).toFixed(setCat.decimals)} var.`
                      : 'Zaten altında.'
                }`
              : 'Canlı kur bekleniyor…'}
          </div>

          <div className="mt-5 rounded-2xl border border-content-secondary/15 p-3.5" style={{ background: 'rgba(11,22,34,0.55)' }}>
            <div className="flex items-center justify-between gap-2.5">
              <div className="text-[13px] text-content-primary">Push bildirimleri</div>
              <button
                onClick={togglePerm}
                aria-label="Push bildirimlerine izin ver"
                className="relative h-[26px] w-11 flex-none rounded-full border-0 transition-colors"
                style={{ background: perm ? '#34E3D6' : 'rgba(143,165,179,0.3)', opacity: permBusy ? 0.6 : 1 }}
              >
                <span
                  className="absolute top-[3px] h-5 w-5 rounded-full bg-content-primary transition-all"
                  style={{ left: perm ? 21 : 3 }}
                />
              </button>
            </div>
            <div className="mt-1.5 text-[11.5px] leading-relaxed text-content-secondary">
              {pushSupported()
                ? 'Seviye kırıldığı an sana ulaşabilmemiz için — uygulama kapalıyken bile.'
                : 'Bu tarayıcı push desteklemiyor; uygulama açıkken yine de haber veririz.'}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={createThreshold}
        disabled={effNewValue == null}
        className="mt-4 w-full rounded-[20px] bg-water p-4 text-base font-semibold text-[#04121a] disabled:opacity-50"
        style={{ boxShadow: '0 16px 40px -14px rgba(52,227,214,0.6)' }}
      >
        Bu seviyeyi izle
      </button>
    </div>
  );

  return (
    <div className="relative min-h-[100dvh] bg-bg-deep">
      {/* ==== mobil: full-bleed su + alt sayfa ==== */}
      <div className="md:hidden">
        <div className="fixed inset-0">{waterPanel}</div>
        <div className="relative z-10 flex min-h-[100dvh] flex-col">
          <header className="flex items-start justify-between px-5 pb-2 pt-5">
            {screen === 'home' ? (
              <div>
                <div className="font-heading text-[19px] font-semibold text-content-primary">Tresh</div>
                <div className="text-[11px] text-content-secondary">{activeCount} seviye izleniyor</div>
              </div>
            ) : (
              <button onClick={() => setScreen('home')} className="flex items-center gap-2 py-1 text-sm text-content-secondary">
                <span className="text-lg leading-none">‹</span> Geri
              </button>
            )}
          </header>
          {banner && <Banner text={banner} onClose={() => setBanner(null)} />}
          <div className="flex-1" />
          {screen === 'home' ? (
            <div className="px-4 pb-8 pt-4">{listPanel}</div>
          ) : (
            <div className="rounded-t-[28px] px-5 pb-8 pt-5" style={{ background: 'rgba(5,11,20,0.72)', backdropFilter: 'blur(10px)', minHeight: '78dvh' }}>
              {setPanel}
            </div>
          )}
        </div>
      </div>

      {/* ==== web: solda su paneli, sağda ray ==== */}
      <div className="hidden min-h-[100dvh] md:flex">
        <div className="relative min-h-[100dvh] flex-1 overflow-hidden">
          {waterPanel}
          <div className="absolute left-12 top-10 z-10">
            <div className="font-heading text-[28px] font-semibold tracking-wide text-content-primary">Tresh</div>
            <div className="mt-0.5 text-sm text-content-secondary">{activeCount} seviye izleniyor</div>
          </div>
          {banner && (
            <div className="absolute left-1/2 top-6 z-30 -translate-x-1/2">
              <Banner text={banner} onClose={() => setBanner(null)} wide />
            </div>
          )}
        </div>
        <aside
          className="flex min-h-[100dvh] w-[480px] flex-none flex-col border-l border-content-secondary/10 px-10 py-9 xl:w-[540px]"
          style={{ background: 'linear-gradient(180deg,#0B1622,#081019)' }}
        >
          <div className="mb-6 flex items-center justify-between">
            {screen === 'home' ? (
              <h1 className="font-heading text-2xl text-content-primary">Seviyelerin</h1>
            ) : (
              <button onClick={() => setScreen('home')} className="flex items-center gap-2 text-[15px] text-content-secondary">
                <span className="text-xl leading-none">‹</span> Geri
              </button>
            )}
          </div>
          {screen === 'home' ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto">{isEmpty ? (
                <div className="flex h-full flex-col items-center justify-center px-5 text-center">
                  <div className="mb-2.5 font-heading text-[26px] text-content-primary">Durgun su.</div>
                  <div className="max-w-[300px] text-[15px] leading-relaxed text-content-secondary">
                    İlk eşiğini kur; seviyeyi senin yerine biz izleyelim — sen uzaktayken bile.
                  </div>
                </div>
              ) : listPanel}</div>
              {isEmpty && (
                <button
                  onClick={() => { setScreen('set'); setNewValue(null); }}
                  className="mt-5 w-full rounded-[20px] bg-water p-4 text-base font-semibold text-[#04121a]"
                  style={{ boxShadow: '0 18px 44px -16px rgba(52,227,214,0.6)' }}
                >
                  Eşik belirle
                </button>
              )}
            </div>
          ) : (
            <div className="min-h-0 flex-1">{setPanel}</div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Banner({ text, onClose, wide }: { text: string; onClose: () => void; wide?: boolean }) {
  return (
    <div className={`banner-in ${wide ? '' : 'mx-4'} z-30`}>
      <div
        className="flex items-start gap-3 rounded-2xl border p-3.5 backdrop-blur-xl"
        style={{
          background: 'rgba(18,34,54,0.88)',
          borderColor: 'rgba(255,150,74,0.42)',
          boxShadow: '0 20px 50px -18px rgba(0,0,0,0.8)',
          minWidth: wide ? 380 : undefined,
        }}
      >
        <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-overflow" style={{ boxShadow: '0 0 14px 2px rgba(255,150,74,0.6)' }} />
        <span className="flex-1">
          <span className="mb-0.5 block text-xs tracking-wide text-content-secondary">Eşik geçildi</span>
          <span className="block text-sm leading-normal text-content-primary">{text}</span>
        </span>
        <button onClick={onClose} aria-label="Kapat" className="px-1 text-content-secondary">×</button>
      </div>
    </div>
  );
}
