import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, StatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as Localization from 'expo-localization';
import { CRYPTO_BASES, PAIR_CATALOG, dictionaries, fmtNum, pairKey, tensionOf, type Locale, type Threshold } from '@tresh/shared';

import { COLORS } from './src/lib/theme';
import { loadThresholds, saveThresholds } from './src/lib/storage';
import { clearNotifLog, logNotifLocal, readNotifLog, type NotifLogEntry } from './src/lib/notifLog';
import { useRates } from './src/hooks/useRates';
import { enablePush, syncMobileThresholds } from './src/lib/push';
import { LiveActivity } from './modules/live-activity';
import WaterBackground from './src/components/WaterBackground';
import HomeScreen from './src/screens/HomeScreen';
import SetScreen from './src/screens/SetScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';

type Screen = 'home' | 'set' | 'notifications';

function detectLocale(): Locale {
  const tag = Localization.getLocales()[0]?.languageCode ?? 'en';
  return tag === 'tr' ? 'tr' : 'en';
}

function clampPx(min: number, vwPct: number, max: number, width: number): number {
  return Math.min(max, Math.max(min, width * (vwPct / 100)));
}

export default function App() {
  const [locale] = useState<Locale>(detectLocale);
  const d = dictionaries[locale].app;
  const win = useWindowDimensions();

  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [banner, setBanner] = useState<string | null>(null);
  const [overflowTick, setOverflowTick] = useState(0);
  const [notifLog, setNotifLog] = useState<NotifLogEntry[]>([]);
  const [surfaceY, setSurfaceY] = useState(win.height * 0.5);

  const [newPairIdx, setNewPairIdx] = useState(0);
  const [newDir, setNewDir] = useState<'above' | 'below'>('above');
  const [newValue, setNewValue] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    loadThresholds().then((loaded) => {
      setThresholds(loaded);
      setSelectedId(loaded[0]?.id ?? null);
      setHydrated(true);
    });
    readNotifLog().then(setNotifLog);
  }, []);

  const watchedPairs = useMemo(() => {
    const set = new Set(thresholds.map((t) => pairKey(t.base, t.quote)));
    const selPair = pairKey(PAIR_CATALOG[newPairIdx].base, PAIR_CATALOG[newPairIdx].quote);
    set.add(selPair);
    return [...set];
  }, [thresholds, newPairIdx]);

  const { rates } = useRates(hydrated ? watchedPairs : []);

  const persist = useCallback((next: Threshold[]) => {
    setThresholds(next);
    saveThresholds(next);
    syncMobileThresholds(next, locale);
  }, [locale]);

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
          const text = d.bannerText(key, fmtNum(t.value, t.decimals, locale), t.dir, fmtNum(cur, t.decimals, locale));
          setBanner(text);
          setOverflowTick((n) => n + 1);
          setTimeout(() => setBanner(null), 6000);
          const entry: NotifLogEntry = { id: `local-${Date.now()}`, title: `Tresh · ${key}`, body: text, ts: Date.now() };
          logNotifLocal(entry);
          setNotifLog((p) => [entry, ...p].slice(0, 60));
        }
      }
      prevRates.current[t.id] = cur;
    }
  }, [rates, thresholds, d, locale]);

  useEffect(() => {
    if (!hydrated) return;
    const top = thresholds.find((t) => !t.paused) ?? thresholds[0];
    if (!top) {
      LiveActivity.end();
      return;
    }
    const rate = rates[pairKey(top.base, top.quote)]?.rate;
    if (rate == null) return;
    LiveActivity.startOrUpdate(pairKey(top.base, top.quote), rate, top.value, top.dir, top.decimals);
  }, [hydrated, thresholds, rates]);

  const setCat = PAIR_CATALOG[newPairIdx];
  const setLive = rates[pairKey(setCat.base, setCat.quote)]?.rate ?? null;
  const defaultOffset = CRYPTO_BASES.has(setCat.base) ? (setLive ?? 0) * 0.015 : Math.pow(10, -setCat.decimals);
  const effNewValue = newValue ?? (setLive != null ? setLive + defaultOffset * (newDir === 'above' ? 1 : -1) : null);

  const selected = thresholds.find((t) => t.id === selectedId) ?? thresholds[0] ?? null;
  const selectedCat = selected ? PAIR_CATALOG.find((p) => p.base === selected.base && p.quote === selected.quote) : null;
  const selectedRate = selected ? rates[pairKey(selected.base, selected.quote)]?.rate ?? null : null;

  const onSetScreen = screen === 'set';
  const displayCat = onSetScreen ? setCat : selectedCat;
  const displayRate = onSetScreen ? setLive : selectedRate;
  const displayValue = onSetScreen ? effNewValue : selected?.value ?? null;
  const displayDecimals = onSetScreen ? setCat.decimals : selected?.decimals ?? setCat.decimals;

  const span = displayCat?.span ?? 1;
  const center = displayValue ?? displayRate ?? 0;
  const min = center - span / 2;
  const clamp01 = (v: number) => Math.max(0.06, Math.min(0.94, v));
  const level = displayRate != null ? clamp01((displayRate - min) / span) : 0.42;
  const thrLevel = displayValue != null ? clamp01((displayValue - min) / span) : 0.62;
  const tension = displayValue != null && displayRate != null ? tensionOf(displayRate, displayValue, span) : 0;

  const readoutTop = onSetScreen ? 84 : Math.max(120, Math.min(surfaceY - 150, 420));
  const readoutFontSize = onSetScreen ? clampPx(40, 7.5, 76, win.width) : clampPx(44, 8, 86, win.width);

  const submitThreshold = () => {
    if (effNewValue == null) return;
    const value = +effNewValue.toFixed(setCat.decimals);
    if (editingId) {
      persist(thresholds.map((t) => (t.id === editingId ? { ...t, base: setCat.base, quote: setCat.quote, decimals: setCat.decimals, value, dir: newDir } : t)));
      setSelectedId(editingId);
    } else {
      const t: Threshold = { id: 't' + Date.now(), base: setCat.base, quote: setCat.quote, decimals: setCat.decimals, value, dir: newDir, paused: false, createdAt: Date.now() };
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

  const togglePause = (id: string) => persist(thresholds.map((t) => (t.id === id ? { ...t, paused: !t.paused } : t)));
  const removeThreshold = (id: string) => {
    const next = thresholds.filter((t) => t.id !== id);
    persist(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
    if (editingId === id) {
      setEditingId(null);
      setScreen('home');
    }
  };

  const openNotifications = useCallback(() => setScreen('notifications'), []);
  const clearAllNotifications = useCallback(() => {
    clearNotifLog();
    setNotifLog([]);
  }, []);

  const togglePush = useCallback(async () => {
    if (pushEnabled || pushBusy) return;
    setPushBusy(true);
    setPushError(null);
    const res = await enablePush(thresholds, locale);
    setPushEnabled(res.ok);
    if (!res.ok) {
      const map: Record<string, string> = {
        'unsupported-device': d.pushUnsupported,
        denied: d.pushDenied,
        'missing-project-id': d.pushMissingConfig,
        'token-failed': d.pushFailed,
        'sync-failed': d.pushFailed,
      };
      setPushError(map[res.reason] ?? d.pushFailed);
    }
    setPushBusy(false);
  }, [pushEnabled, pushBusy, thresholds, locale, d]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />
      <View style={StyleSheet.absoluteFillObject}>
        <WaterBackground
          level={level}
          thresholdLevel={thrLevel}
          tension={tension}
          overflowTick={overflowTick}
          loading={!hydrated}
          width={win.width}
          height={win.height}
          onSurfaceY={setSurfaceY}
        />
        <View pointerEvents="none" style={styles.vignetteTop} />
        <View pointerEvents="none" style={styles.vignetteBottom} />
      </View>

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.header} pointerEvents="box-none">
          <Text style={styles.headerTitle}>Tresh</Text>
          {screen === 'home' && (
            <Pressable style={styles.bellBtn} onPress={openNotifications} hitSlop={8}>
              <Text style={styles.bellGlyph}>🔔</Text>
              {notifLog.length > 0 && <View style={styles.bellDot} />}
            </Pressable>
          )}
        </View>

        <View style={[styles.readout, { top: readoutTop }]} pointerEvents="box-none">
          <Text style={styles.readoutLabel}>
            {onSetScreen ? pairKey(setCat.base, setCat.quote) : selected ? pairKey(selected.base, selected.quote) : pairKey(setCat.base, setCat.quote)}
          </Text>
          {onSetScreen && displayRate != null ? (
            <Pressable onPress={() => setNewValue(displayRate)} hitSlop={8}>
              <Text style={[styles.readoutValue, { fontSize: readoutFontSize }]}>{fmtNum(displayRate, displayDecimals, locale)}</Text>
            </Pressable>
          ) : (
            <Text style={[styles.readoutValue, { fontSize: readoutFontSize }]}>
              {!hydrated && displayRate == null ? '· · ·' : displayRate != null ? fmtNum(displayRate, displayDecimals, locale) : '—'}
            </Text>
          )}
          {!onSetScreen && selected && selectedRate != null && (
            <Text style={styles.readoutToday}>
              {d.today(
                `${selectedRate - (rates[pairKey(selected.base, selected.quote)]?.opening ?? selectedRate) >= 0 ? '+' : ''}${fmtNum(selectedRate - (rates[pairKey(selected.base, selected.quote)]?.opening ?? selectedRate), selected.decimals, locale)}`,
                selected.dir,
                fmtNum(selected.value, selected.decimals, locale)
              )}
            </Text>
          )}
        </View>

        {banner && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{banner}</Text>
          </View>
        )}
      </SafeAreaView>

      <View style={styles.panel}>
        {screen === 'home' && (
          <HomeScreen
            d={d}
            locale={locale}
            thresholds={thresholds}
            rates={rates}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onEdit={openEdit}
            onTogglePause={togglePause}
            onDelete={removeThreshold}
            onAdd={startAdd}
          />
        )}
        {screen === 'set' && (
          <SetScreen
            d={d}
            locale={locale}
            isEditing={editingId != null}
            pairIdx={newPairIdx}
            onSelectPair={(i) => { setNewPairIdx(i); setNewValue(null); }}
            dir={newDir}
            onSelectDir={setNewDir}
            liveRate={setLive}
            value={newValue}
            onValueChange={setNewValue}
            onSave={submitThreshold}
            onDelete={editingId ? () => removeThreshold(editingId) : undefined}
            onCancel={() => { setScreen('home'); setEditingId(null); setNewValue(null); }}
          />
        )}
        {screen === 'notifications' && (
          <NotificationsScreen
            d={d}
            entries={notifLog}
            onClearAll={clearAllNotifications}
            pushEnabled={pushEnabled}
            pushBusy={pushBusy}
            pushError={pushError}
            onTogglePush={togglePush}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgDeep },
  vignetteTop: { position: 'absolute', left: 0, right: 0, top: 0, height: 140, backgroundColor: 'rgba(5,11,20,0.35)' },
  vignetteBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 220, backgroundColor: 'rgba(5,11,20,0.55)' },
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.contentPrimary },
  bellBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(18,34,54,0.7)' },
  bellGlyph: { fontSize: 16 },
  bellDot: { position: 'absolute', top: 6, right: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.overflow },
  readout: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  readoutLabel: { fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: COLORS.contentSecondary, marginBottom: 6 },
  readoutValue: {
    fontWeight: '400', letterSpacing: -1.5, color: COLORS.contentPrimary,
    textShadowColor: 'rgba(5,11,20,0.9)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 30,
  },
  readoutToday: { marginTop: 8, fontSize: 13, color: COLORS.contentSecondary, textAlign: 'center' },
  banner: {
    position: 'absolute', left: 16, right: 16, top: 60,
    backgroundColor: 'rgba(52,227,214,0.14)', borderWidth: 1, borderColor: 'rgba(52,227,214,0.4)', borderRadius: 14, padding: 12,
  },
  bannerText: { color: COLORS.contentPrimary, fontSize: 13, lineHeight: 18 },
  panel: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: '66%', zIndex: 3,
    backgroundColor: 'rgba(4,9,14,0.92)', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 18, paddingBottom: 28,
  },
});
