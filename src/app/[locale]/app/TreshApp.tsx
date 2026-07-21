'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import Link from 'next/link';
import WaterCanvas from '@/components/WaterCanvas';
import AddToHomeScreen from '@/components/AddToHomeScreen';
import { PAIR_CATALOG, CRYPTO_BASES, pairKey, type PairDef, type Threshold } from '@/lib/pairs';
import { localRepository } from '@/lib/client/storage';
import { enablePush, pushSupported, registerServiceWorker, syncThresholds } from '@/lib/client/push';
import { useRates } from '@/lib/client/useRates';
import { dictionaries, localePath, type AppDict, type Locale } from '@/lib/i18n';
import { tensionOf, miniWavePath } from '@/lib/client/wave';
import { fmtNum, parseLocaleNumber } from '@/lib/client/format';
import { pushTopWatch, pushWatchList } from '@/lib/client/nativeBridge';

type Screen = 'home' | 'set';

const cataloguePairs = PAIR_CATALOG.map((p) => pairKey(p.base, p.quote));

export default function TreshApp({ locale }: { locale: Locale }) {
  const d = dictionaries[locale].app;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [perm, setPerm] = useState(false);
  const [permBusy, setPermBusy] = useState(false);
  const [permError, setPermError] = useState<string | null>(null);

  useEffect(() => {
    const loaded = localRepository.load();
    setThresholds(loaded);
    setSelectedId(loaded[0]?.id ?? null);
    setHydrated(true);
    registerServiceWorker();
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') setPerm(true);
    // Uygulama açılınca ikon rozetini ve service worker sayacını sıfırla.
    try {
      (navigator as unknown as { clearAppBadge?: () => Promise<void> }).clearAppBadge?.();
      navigator.serviceWorker?.controller?.postMessage('badge-clear');
      navigator.serviceWorker?.ready.then((reg) => reg.active?.postMessage('badge-clear'));
    } catch { /* desteklenmiyor */ }
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
    syncThresholds(next, locale);
  }, [locale]);

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
          setBanner(d.bannerText(key, fmtNum(t.value, t.decimals, locale), t.dir, fmtNum(cur, t.decimals, locale)));
          setOverflowTick((n) => n + 1);
          window.setTimeout(() => setBanner(null), 6000);
        }
      }
      prevRates.current[t.id] = cur;
    }
  }, [rates, thresholds, d, locale]);

  // ---- iOS native köprü: takip listesi + en üstteki takibi Dynamic Island'a aktar ----
  // (Safari'de no-op; yalnızca native WKWebView sarmalayıcı içinde çalışır.)
  useEffect(() => {
    pushWatchList(thresholds);
  }, [thresholds]);

  useEffect(() => {
    const top = thresholds[0] ?? null;
    if (!top) { pushTopWatch(null); return; }
    const key = pairKey(top.base, top.quote);
    pushTopWatch({
      pair: key,
      value: top.value,
      dir: top.dir,
      decimals: top.decimals,
      rate: rates[key]?.rate ?? null,
    });
  }, [thresholds, rates]);

  // ---- set flow helpers ----
  const setCat = PAIR_CATALOG[newPairIdx];
  const setPairKeyStr = pairKey(setCat.base, setCat.quote);
  const setLive = rates[setPairKeyStr]?.rate ?? null;
  const setMin = (setLive ?? 0) - setCat.span / 2;
  // Varsayılan eşik: kripto paritelerde (BTC/TRY, BTC/USD) canlı kurun
  // %1.5'i kadar uzakta başlar — yüksek değerli olduklarından orantılı bir
  // sıçrama mantıklı. Fiat kurlarda ise (USD/TRY gibi) en küçük anlamlı
  // birim kadar uzakta başlar — ör. 47,19 için üstü 47,20, altı 47,18.
  const defaultOffset = CRYPTO_BASES.has(setCat.base)
    ? (setLive ?? 0) * 0.015
    : Math.pow(10, -setCat.decimals);
  const effNewValue = newValue ?? (setLive != null ? setLive + defaultOffset * (newDir === 'above' ? 1 : -1) : null);
  const fillPct = setLive != null && effNewValue != null ? Math.max(0, Math.min(100, ((effNewValue - setMin) / setCat.span) * 100)) : 50;
  const floatTop = 100 - fillPct;

  // ---- Su geometrisi ----
  // Ayar ekranındayken (screen === 'set') su, seçili eski eşiği değil,
  // üzerinde çalışılan pariteyi göstermeli — aksi halde "PAIR" listesinde
  // BTC/USD seçseniz bile üstteki gösterge hâlâ eski USD/TRY eşiğini
  // gösterip kafa karıştırıyordu.
  const onSetScreen = screen === 'set';
  const displayCat = onSetScreen ? setCat : selectedCatalog;
  const displayRate = onSetScreen ? setLive : selectedRate?.rate ?? null;
  const displayValue = onSetScreen ? effNewValue : selected?.value ?? null;
  const displayDecimals = onSetScreen ? setCat.decimals : selected?.decimals ?? setCat.decimals;

  const span = displayCat?.span ?? 1;
  const center = displayValue ?? displayRate ?? 0;
  const min = center - span / 2;
  const clamp01 = (v: number) => Math.max(0.06, Math.min(0.94, v));
  const level = displayRate != null ? clamp01((displayRate - min) / span) : 0.42;
  const thrLevel = displayValue != null ? clamp01((displayValue - min) / span) : 0.62;
  const tension = displayValue != null && displayRate != null ? tensionOf(displayRate, displayValue, span) : 0;

  const [surfaceY, setSurfaceY] = useState(300);
  const onSurfaceY = useCallback((y: number) => {
    setSurfaceY((prev) => (Math.abs(prev - y) > 0.5 ? y : prev));
  }, []);

  const submitThreshold = () => {
    if (effNewValue == null) return;
    const value = +effNewValue.toFixed(setCat.decimals);
    if (editingId) {
      persist(thresholds.map((t) => (
        t.id === editingId
          ? { ...t, base: setCat.base, quote: setCat.quote, decimals: setCat.decimals, value, dir: newDir }
          : t
      )));
      setSelectedId(editingId);
    } else {
      const t: Threshold = {
        id: 't' + Date.now(),
        base: setCat.base,
        quote: setCat.quote,
        decimals: setCat.decimals,
        value,
        dir: newDir,
        paused: false,
        createdAt: Date.now(),
      };
      persist([...thresholds, t]);
      setSelectedId(t.id);
    }
    setScreen('home');
    setNewValue(null);
    setEditingId(null);
  };

  const openEdit = (t: Threshold) => {
    const idx = PAIR_CATALOG.findIndex((p) => p.base === t.base && p.quote === t.quote);
    if (idx === -1) return;
    setNewPairIdx(idx);
    setNewDir(t.dir);
    setNewValue(t.value);
    setEditingId(t.id);
    setSelectedId(t.id);
    setScreen('set');
  };

  const startAdd = () => {
    setEditingId(null);
    setNewValue(null);
    setScreen('set');
  };

  const togglePerm = async () => {
    if (perm || permBusy) return;
    setPermBusy(true);
    setPermError(null);
    const res = await enablePush(thresholds, locale);
    setPerm(res.ok);
    if (!res.ok) {
      // 'unsupported' zaten togglin altındaki temel açıklamada (pushUnsupported)
      // gösteriliyor — burada tekrar basmak aynı cümleyi iki kez gösterirdi.
      const map: Record<string, string> = {
        denied: d.pushDenied,
        'missing-vapid': d.pushMissingConfig,
        unsupported: '',
        'subscribe-failed': d.pushFailed,
        'sync-failed': d.pushFailed,
        dismissed: '',
      };
      // '' boş string JS'te falsy olduğu için '||' burada yanlışlıkla
      // fallback'e düşüyordu — anahtarın map'te olup olmadığını ayrıca kontrol et.
      setPermError(res.reason in map ? map[res.reason] : d.pushFailed);
    }
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
  // Ayar ekranındayken rakam, alttaki panelin üstünde sabit bir yerde
  // kalmalı — aksi halde panel arkasında yarı görünür/tıklanamaz hale
  // geliyordu (canlı kura dokunma kısayolu erişilemez oluyordu).
  const readoutTop = onSetScreen ? 68 : Math.max(120, Math.min(surfaceY - 150, 420));
  // Ayar ekranında panel (alt sayfa) daha az yükseklik kaplıyor ki üstteki
  // kur okuması ile panelin kendi başlığı ("Eşik belirle") çakışmasın —
  // küçük ekranlarda (ör. iPhone SE) 78dvh panel + 86px'lik büyük rakam
  // panelin başlığının üstüne biniyordu.
  const readoutFontSize = onSetScreen ? 'clamp(34px, 7vw, 60px)' : 'clamp(44px, 8vw, 86px)';

  const listItems = thresholds.map((t) => {
    const key = pairKey(t.base, t.quote);
    const live = rates[key]?.rate;
    const cat = PAIR_CATALOG.find((p) => p.base === t.base && p.quote === t.quote)!;
    const tens = live != null ? tensionOf(live, t.value, cat.span) : 0;
    const dist = live != null ? Math.abs(live - t.value) : null;
    let color: string, status: string, statusColor: string;
    if (t.paused) {
      color = '#5f7585'; status = d.statusMuted; statusColor = '#5f7585';
    } else {
      const dull = [46, 164, 160], vivid = [56, 231, 217];
      color = `rgb(${dull.map((d, i) => Math.round(d + (vivid[i] - d) * tens)).join(',')})`;
      status = tens > 0.72 ? d.statusApproaching : tens > 0.4 ? d.statusWatching : d.statusCalm;
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
          {onSetScreen ? setPairKeyStr : selected ? pairKey(selected.base, selected.quote) : setPairKeyStr}
        </div>
        {onSetScreen && displayRate != null ? (
          <button
            onClick={() => setNewValue(displayRate)}
            className="num text-content-primary transition-opacity active:opacity-60"
            style={{
              pointerEvents: 'auto',
              fontSize: readoutFontSize,
              fontWeight: 400,
              letterSpacing: '-1.5px',
              lineHeight: 1,
              textShadow: '0 2px 30px rgba(5,11,20,0.9)',
            }}
            aria-label={d.useCurrentRate}
            title={d.useCurrentRate}
          >
            {fmtNum(displayRate, displayDecimals, locale)}
          </button>
        ) : (
          <div
            className="num text-content-primary"
            style={{ fontSize: readoutFontSize, fontWeight: 400, letterSpacing: '-1.5px', lineHeight: 1, textShadow: '0 2px 30px rgba(5,11,20,0.9)' }}
          >
            {loading && displayRate == null ? '· · ·' : displayRate != null ? fmtNum(displayRate, displayDecimals, locale) : '—'}
          </div>
        )}
        {!onSetScreen && selected && selectedRate && (
          <div className="num mt-2 text-[13px] text-content-secondary">
            {d.today(
              `${selectedRate.rate - selectedRate.opening >= 0 ? '+' : ''}${fmtNum(selectedRate.rate - selectedRate.opening, selected.decimals, locale)}`,
              selected.dir,
              fmtNum(selected.value, selected.decimals, locale)
            )}
          </div>
        )}
      </div>
      {/* hata durumu: sakin, olgusal */}
      {error && (
        <div className="absolute left-4 right-4 top-[118px] z-10 md:left-12 md:right-auto md:max-w-md">
          <div className="rounded-2xl border border-content-secondary/20 bg-bg-surface/70 p-4 backdrop-blur-md">
            <div className="mb-0.5 text-sm text-content-primary">{d.errorTitle}</div>
            <div className="mb-3 text-[13px] leading-relaxed text-content-secondary">{d.errorBody}</div>
            <button
              onClick={retry}
              className="rounded-xl border border-water/40 bg-water/15 px-4 py-2 text-[13px] text-water"
            >
              {d.reconnect}
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
          <div className="mb-2 font-heading text-[22px] leading-snug text-content-primary">{d.emptyTitle}</div>
          <div className="mx-auto mb-1 max-w-[280px] text-sm leading-relaxed text-content-secondary">{d.emptyBody}</div>
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
              <button onClick={() => openEdit(t)} className="flex min-w-0 flex-1 items-center gap-3.5 text-left">
                <svg width="60" height="26" viewBox="0 0 60 26" className="flex-none overflow-visible">
                  <path d={miniWavePath(lvl, 60, 26)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
                  <line x1="0" y1={(26 * (1 - markLvl) * 0.7 + 26 * 0.15).toFixed(1)} x2="60" y2={(26 * (1 - markLvl) * 0.7 + 26 * 0.15).toFixed(1)} stroke={color} strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
                </svg>
                <span className="min-w-0 flex-1">
                  <span className="num block text-sm tracking-wide text-content-primary">{key}</span>
                  <span className="mt-0.5 block text-xs text-content-secondary">
                    {t.dir === 'above' ? d.above : d.below} {fmtNum(t.value, t.decimals, locale)}
                    {!t.paused && dist != null ? d.away(fmtNum(dist, t.decimals, locale)) : ''}
                  </span>
                </span>
                <span className="flex-none text-right">
                  <span className="num block text-sm" style={{ color }}>{live != null ? fmtNum(live, t.decimals, locale) : '—'}</span>
                  <span className="mt-0.5 block text-[11px]" style={{ color: statusColor }}>{status}</span>
                </span>
              </button>
              <div className="flex flex-none flex-col gap-1.5">
                <button
                  onClick={() => togglePause(t.id)}
                  aria-label={t.paused ? d.resume : d.mute}
                  title={t.paused ? d.resume : d.mute}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-content-secondary transition-colors hover:bg-bg-raised hover:text-content-primary"
                >
                  {t.paused ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8V4z" /></svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zm8 0h4v16h-4z" /></svg>
                  )}
                </button>
                <button
                  onClick={() => removeThreshold(t.id)}
                  aria-label={d.deleteThreshold}
                  title={d.deleteThreshold}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-content-secondary transition-colors hover:bg-overflow/15 hover:text-overflow"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={startAdd}
        className="w-full rounded-[20px] bg-water p-4 text-base font-semibold text-[#04121a]"
        style={{ boxShadow: '0 16px 40px -14px rgba(52,227,214,0.6)' }}
      >
        {d.setThreshold}
      </button>
    </>
  );

  const setPanelProps = {
    d,
    locale,
    isEditing: editingId != null,
    newPairIdx,
    onSelectPair: (i: number) => { setNewPairIdx(i); setNewValue(null); },
    newDir,
    onSelectDir: setNewDir,
    setCat,
    setPairKeyStr,
    setLive,
    setMin,
    effNewValue,
    fillPct,
    floatTop,
    onNewValue: setNewValue,
    perm,
    permBusy,
    permError,
    onTogglePerm: togglePerm,
    onCreate: submitThreshold,
  };

  return (
    <div className="relative min-h-[100dvh] bg-bg-deep">
      {/* ==== mobil: full-bleed su + alt sayfa ==== */}
      <div className="md:hidden">
        <div className="fixed inset-0">{waterPanel}</div>
        {/* pointer-events-none: bu sütun tam ekran yüksekliğinde ama çoğu
            alanı boş — none olmazsa su panelindeki tıklanabilir öğeleri
            (ör. canlı kura dokunma kısayolu) engelliyordu. Gerçek içerik
            blokları kendi pointer-events-auto'sunu taşıyor. */}
        <div className="relative z-10 flex min-h-[100dvh] flex-col pointer-events-none">
          <header className="pointer-events-auto flex items-start justify-between px-5 pb-2 pt-5">
            {screen === 'home' ? (
              <div>
                <div className="font-heading text-[19px] font-semibold text-content-primary">Tresh</div>
                <div className="text-[11px] text-content-secondary">{d.levelsWatched(activeCount)}</div>
              </div>
            ) : (
              <button onClick={() => { setScreen('home'); setEditingId(null); }} className="flex items-center gap-2 py-1 text-sm text-content-secondary">
                <span className="text-lg leading-none">‹</span> {d.back}
              </button>
            )}
            <HomeButton locale={locale} label={d.home} />
          </header>
          {banner && (
            <div className="pointer-events-auto">
              <Banner text={banner} d={d} onClose={() => setBanner(null)} />
            </div>
          )}
          <div className="flex-1" />
          {screen === 'home' ? (
            <div className="pointer-events-auto px-4 pb-8 pt-4">{listPanel}</div>
          ) : (
            <div className="pointer-events-auto rounded-t-[28px] px-5 pb-8 pt-5" style={{ background: 'rgba(5,11,20,0.72)', backdropFilter: 'blur(10px)', minHeight: '68dvh' }}>
              <SetPanel {...setPanelProps} />
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
            <div className="mt-0.5 text-sm text-content-secondary">{d.levelsWatched(activeCount)}</div>
          </div>
          <div className="absolute right-12 top-10 z-10">
            <HomeButton locale={locale} label={d.home} />
          </div>
          {banner && (
            <div className="absolute left-1/2 top-6 z-30 -translate-x-1/2">
              <Banner text={banner} d={d} onClose={() => setBanner(null)} wide />
            </div>
          )}
        </div>
        <aside
          className="flex min-h-[100dvh] w-[480px] flex-none flex-col border-l border-content-secondary/10 px-10 py-9 xl:w-[540px]"
          style={{ background: 'linear-gradient(180deg,#0B1622,#081019)' }}
        >
          <div className="mb-6 flex items-center justify-between">
            {screen === 'home' ? (
              <h1 className="font-heading text-2xl text-content-primary">{d.yourLevels}</h1>
            ) : (
              <button onClick={() => { setScreen('home'); setEditingId(null); }} className="flex items-center gap-2 text-[15px] text-content-secondary">
                <span className="text-xl leading-none">‹</span> {d.back}
              </button>
            )}
          </div>
          {screen === 'home' ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto">{isEmpty ? (
                <div className="flex h-full flex-col items-center justify-center px-5 text-center">
                  <div className="mb-2.5 font-heading text-[26px] text-content-primary">{d.emptyTitle}</div>
                  <div className="max-w-[300px] text-[15px] leading-relaxed text-content-secondary">{d.emptyBody}</div>
                </div>
              ) : listPanel}</div>
              {isEmpty && (
                <button
                  onClick={startAdd}
                  className="mt-5 w-full rounded-[20px] bg-water p-4 text-base font-semibold text-[#04121a]"
                  style={{ boxShadow: '0 18px 44px -16px rgba(52,227,214,0.6)' }}
                >
                  {d.setThreshold}
                </button>
              )}
            </div>
          ) : (
            <div className="min-h-0 flex-1"><SetPanel {...setPanelProps} /></div>
          )}
        </aside>
      </div>
    </div>
  );
}

interface SetPanelProps {
  d: AppDict;
  locale: Locale;
  isEditing: boolean;
  newPairIdx: number;
  onSelectPair: (i: number) => void;
  newDir: 'above' | 'below';
  onSelectDir: (dir: 'above' | 'below') => void;
  setCat: PairDef;
  setPairKeyStr: string;
  setLive: number | null;
  setMin: number;
  effNewValue: number | null;
  fillPct: number;
  floatTop: number;
  onNewValue: (v: number) => void;
  perm: boolean;
  permBusy: boolean;
  permError: string | null;
  onTogglePerm: () => void;
  onCreate: () => void;
}

/**
 * Eşik belirleme paneli — mobil ve masaüstü düzenlerinde iki ayrı yerde
 * render edilir. Bilerek kendi bileşeni: sürükleme ref'leri (trackRef vb.)
 * burada, fonksiyon bileşeni içinde tanımlanıyor ki her render konumu kendi
 * DOM düğümlerine sahip olsun. Daha önce bu ref'ler TreshApp'in üst
 * seviyesinde tanımlıydı ve aynı JSX ağacı iki yerde kullanıldığından, ikinci
 * (görünmeyen) kopya ref'i ele geçiriyordu — sürükleme sırasındaki tüm
 * imperative DOM güncellemeleri görünmeyen kopyaya gidiyor, kullanıcının
 * gördüğü çubuk hiç hareket etmiyordu (özellikle dokunmatikte fark ediliyordu).
 */
function SetPanel({
  d, locale, isEditing, newPairIdx, onSelectPair, newDir, onSelectDir, setCat, setPairKeyStr, setLive, setMin,
  effNewValue, fillPct, floatTop, onNewValue, perm, permBusy, permError, onTogglePerm, onCreate,
}: SetPanelProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  const valueTextRef = useRef<HTMLInputElement>(null);
  const helperTextRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  // Sürükleme başında ölçülür, sürükleme boyunca yeniden ölçülmez —
  // getBoundingClientRect her pointermove'da çağrılırsa senkron layout'u
  // zorlayıp asıl kasmaya sebep oluyordu.
  const rectRef = useRef<{ top: number; height: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingYRef = useRef<number | null>(null);
  const lastValueRef = useRef<number | null>(null);

  // Sürükleme sırasında DOM'a doğrudan yazar — React state'i tetiklemez,
  // böylece her pointermove'da tüm ağacı yeniden render etmeden fareyi
  // birebir (aynı karede) takip eder.
  const applyDrag = useCallback((value: number) => {
    const clampedFill = Math.max(0, Math.min(100, ((value - setMin) / setCat.span) * 100));
    const top = 100 - clampedFill;
    if (fillRef.current) fillRef.current.style.height = `${clampedFill}%`;
    if (floatRef.current) floatRef.current.style.top = `${top}%`;
    if (valueTextRef.current && document.activeElement !== valueTextRef.current) {
      valueTextRef.current.value = fmtNum(value, setCat.decimals, locale);
    }
    if (helperTextRef.current && setLive != null) {
      const alreadyPast = newDir === 'above' ? value <= setLive : value >= setLive;
      helperTextRef.current.textContent = d.helper(
        fmtNum(setLive, setCat.decimals, locale),
        newDir,
        fmtNum(Math.abs(value - setLive), setCat.decimals, locale),
        alreadyPast
      );
    }
    if (trackRef.current) trackRef.current.setAttribute('aria-valuenow', String(value));
  }, [setMin, setCat.span, setCat.decimals, setLive, newDir, d, locale]);

  // Dışarıdan (ör. üstteki canlı kur rakamına dokununca) effNewValue değişirse
  // input/su çubuğunu senkronize et — input uncontrolled olduğundan
  // defaultValue yalnızca mount anında uygulanır, sonraki değişiklikleri
  // yakalamaz.
  useEffect(() => {
    if (effNewValue != null) applyDrag(effNewValue);
  }, [effNewValue, applyDrag]);

  const valueFromY = useCallback((clientY: number) => {
    const rect = rectRef.current;
    if (!rect || setLive == null) return null;
    const p01 = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return setMin + (1 - p01) * setCat.span;
  }, [setLive, setMin, setCat.span]);

  const onTrackMove = useCallback((clientY: number) => {
    const el = trackRef.current;
    if (!el || setLive == null) return null;
    const r = el.getBoundingClientRect();
    rectRef.current = { top: r.top, height: r.height };
    return valueFromY(clientY);
  }, [setLive, valueFromY]);

  // Sürükleme dinleyicileri element üzerinde, Pointer Capture ile kuruluyor —
  // window'a bağlı pasif dinleyiciler iOS Safari'de dokunmatik sürüklemeyi
  // sayfa kaydırması sanıp gesture'ı iptal edebiliyordu. setPointerCapture,
  // parmak track'in dışına çıksa bile olayların bu elemente gelmeye devam
  // etmesini garanti eder.
  const flushDrag = useCallback(() => {
    rafRef.current = null;
    if (pendingYRef.current != null && dragging.current) {
      const v = valueFromY(pendingYRef.current);
      if (v != null) { lastValueRef.current = v; applyDrag(v); }
    }
  }, [valueFromY, applyDrag]);

  const beginDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    // Sayısal girişte odak varsa kapat — açık kalırsa applyDrag, kullanıcı
    // yazıyor sanıp okunuşu güncellemeyi atlıyor ve rakam donmuş görünüyordu.
    if (valueTextRef.current && document.activeElement === valueTextRef.current) {
      valueTextRef.current.blur();
    }
    try { trackRef.current?.setPointerCapture(e.pointerId); } catch { /* geçersiz pointerId — yoksayılabilir */ }
    dragging.current = true;
    const v = onTrackMove(e.clientY);
    if (v != null) { lastValueRef.current = v; applyDrag(v); onNewValue(v); }
  }, [onTrackMove, applyDrag, onNewValue]);

  const moveDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    pendingYRef.current = e.clientY;
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(flushDrag);
  }, [flushDrag]);

  const endDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    // Bekleyen bir rAF flush'ı varsa (son pointermove henüz işlenmemiş),
    // iptal etmeden önce senkron olarak uygula — yoksa pointerup çok hızlı
    // gelirse (hızlı bir dokunuş/bırakma) son hareket kaybolup sürüklemenin
    // başlangıç değerine geri dönebiliyordu.
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      flushDrag();
    }
    dragging.current = false;
    try { trackRef.current?.releasePointerCapture(e.pointerId); } catch { /* zaten serbest bırakılmış olabilir */ }
    if (lastValueRef.current != null) onNewValue(lastValueRef.current);
    lastValueRef.current = null;
  }, [onNewValue, flushDrag]);

  useEffect(() => () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-1 font-heading text-[26px] leading-tight text-content-primary">{d.setTitle}</div>
      <div className="mb-5 text-sm leading-normal text-content-secondary">{isEditing ? d.editSubtitle : d.setSubtitle}</div>

      <div className="mb-2 text-[11px] uppercase tracking-[1.5px] text-content-secondary">{d.pair}</div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {PAIR_CATALOG.map((p, i) => {
          const on = i === newPairIdx;
          return (
            <button
              key={pairKey(p.base, p.quote)}
              onClick={() => onSelectPair(i)}
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

      <div className="mb-2 text-[11px] uppercase tracking-[1.5px] text-content-secondary">{d.notifyWhen}</div>
      <div className="mb-5 flex gap-2">
        {(['above', 'below'] as const).map((dr) => {
          const on = newDir === dr;
          return (
            <button
              key={dr}
              onClick={() => onSelectDir(dr)}
              className="flex-1 rounded-xl border p-3 text-sm transition-all"
              style={{
                background: on ? 'rgba(52,227,214,0.14)' : 'rgba(11,22,34,0.5)',
                borderColor: on ? 'rgba(52,227,214,0.5)' : 'rgba(143,165,179,0.16)',
                color: on ? '#34E3D6' : '#8FA5B3',
              }}
            >
              {dr === 'above' ? d.dirAbove : d.dirBelow}
            </button>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1 items-stretch gap-5">
        <div
          ref={trackRef}
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          role="slider"
          aria-label={d.thresholdValue}
          aria-valuemin={setMin}
          aria-valuemax={setMin + setCat.span}
          aria-valuenow={effNewValue ?? undefined}
          tabIndex={0}
          onKeyDown={(e) => {
            if (setLive == null || effNewValue == null) return;
            const step = setCat.span / 100;
            if (e.key === 'ArrowUp') onNewValue(Math.min(setMin + setCat.span, effNewValue + step));
            if (e.key === 'ArrowDown') onNewValue(Math.max(setMin, effNewValue - step));
          }}
          className="relative w-[76px] flex-none cursor-ns-resize overflow-hidden rounded-[22px] border border-content-secondary/15 md:w-[92px]"
          style={{ background: 'linear-gradient(180deg,#0B1622,#122236)', touchAction: 'none', minHeight: 180 }}
        >
          <div
            ref={fillRef}
            className="absolute inset-x-0 bottom-0"
            style={{
              height: `${fillPct}%`,
              background: 'linear-gradient(180deg,rgba(52,227,214,0.28),rgba(52,227,214,0.10))',
              borderTop: '1.5px solid rgba(52,227,214,0.7)',
            }}
          />
          <div
            ref={floatRef}
            className="absolute left-2 right-2 flex h-[34px] items-center justify-center rounded-xl bg-water"
            style={{ top: `${floatTop}%`, transform: 'translateY(-50%)', boxShadow: '0 8px 24px -6px rgba(52,227,214,0.7)' }}
          >
            <div className="h-[3px] w-[22px] rounded-sm" style={{ background: 'rgba(4,18,26,0.4)' }} />
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-center">
          <div className="mb-1.5 text-[11px] uppercase tracking-[1.5px] text-content-secondary">{d.threshold}</div>
          {effNewValue != null ? (
            <input
              key={`${setPairKeyStr}-${newDir}`}
              ref={valueTextRef}
              type="text"
              inputMode="decimal"
              pattern="[0-9.,]*"
              defaultValue={fmtNum(effNewValue, setCat.decimals, locale)}
              aria-label={d.thresholdValue}
              className="num block w-full border-0 bg-transparent p-0 text-content-primary outline-none"
              style={{ fontSize: 'clamp(36px, 6vw, 52px)', fontWeight: 500, lineHeight: 1, caretColor: '#34E3D6' }}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => {
                const parsed = parseLocaleNumber(e.currentTarget.value);
                if (!Number.isNaN(parsed)) applyDrag(parsed);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              onBlur={(e) => {
                const parsed = parseLocaleNumber(e.currentTarget.value);
                if (!Number.isNaN(parsed)) {
                  const clamped = Math.max(setMin, Math.min(setMin + setCat.span, parsed));
                  onNewValue(clamped);
                  e.currentTarget.value = fmtNum(clamped, setCat.decimals, locale);
                } else {
                  e.currentTarget.value = fmtNum(effNewValue, setCat.decimals, locale);
                }
              }}
            />
          ) : (
            <div className="num text-content-primary" style={{ fontSize: 'clamp(36px, 6vw, 52px)', fontWeight: 500, lineHeight: 1 }}>
              · · ·
            </div>
          )}
          <div ref={helperTextRef} className="mt-2 text-[13px] leading-relaxed text-content-secondary">
            {setLive != null && effNewValue != null
              ? d.helper(
                  fmtNum(setLive, setCat.decimals, locale),
                  newDir,
                  fmtNum(Math.abs(effNewValue - setLive), setCat.decimals, locale),
                  newDir === 'above' ? effNewValue <= setLive : effNewValue >= setLive
                )
              : d.waitingLive}
          </div>

          <div className="mt-5 rounded-2xl border border-content-secondary/15 p-3.5" style={{ background: 'rgba(11,22,34,0.55)' }}>
            <div className="flex items-center justify-between gap-2.5">
              <div className="text-[13px] text-content-primary">{d.pushTitle}</div>
              <button
                onClick={onTogglePerm}
                aria-label={d.pushAria}
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
              {pushSupported() ? d.pushSupported : d.pushUnsupported}
            </div>
            {permError && (
              <div className="mt-2 text-[11.5px] leading-relaxed text-overflow">{permError}</div>
            )}
            {!perm && <AddToHomeScreen d={d} />}
          </div>
        </div>
      </div>

      <button
        onClick={onCreate}
        disabled={effNewValue == null}
        className="mt-4 w-full rounded-[20px] bg-water p-4 text-base font-semibold text-[#04121a] disabled:opacity-50"
        style={{ boxShadow: '0 16px 40px -14px rgba(52,227,214,0.6)' }}
      >
        {isEditing ? d.updateLevel : d.watchThisLevel}
      </button>
    </div>
  );
}

function HomeButton({ locale, label }: { locale: Locale; label: string }) {
  return (
    <Link
      href={localePath(locale, '/')}
      aria-label={label}
      title={label}
      className="group flex h-10 w-10 items-center justify-center rounded-full border transition-colors"
      style={{
        borderColor: 'rgba(143,165,179,0.22)',
        background: 'rgba(11,22,34,0.55)',
        backdropFilter: 'blur(8px)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(52,227,214,0.5)';
        e.currentTarget.style.background = 'rgba(52,227,214,0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(143,165,179,0.22)';
        e.currentTarget.style.background = 'rgba(11,22,34,0.55)';
      }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="text-content-secondary transition-colors group-hover:text-water">
        <path
          d="M4 11.5 12 4l8 7.5M6.5 9.8V19a1 1 0 0 0 1 1H10a1 1 0 0 0 1-1v-3.5a1 1 0 0 1 1-1h0a1 1 0 0 1 1 1V19a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1V9.8"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}

function Banner({ text, d, onClose, wide }: { text: string; d: AppDict; onClose: () => void; wide?: boolean }) {
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
          <span className="mb-0.5 block text-xs tracking-wide text-content-secondary">{d.bannerLabel}</span>
          <span className="block text-sm leading-normal text-content-primary">{text}</span>
        </span>
        <button onClick={onClose} aria-label={d.close} className="px-1 text-content-secondary">×</button>
      </div>
    </div>
  );
}
