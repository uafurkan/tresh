import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, StatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as Localization from 'expo-localization';
import { BlurView } from 'expo-blur';
import { useFonts as useBricolageFonts, BricolageGrotesque_400Regular, BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque';
import { useFonts as useMartianFonts, MartianMono_400Regular, MartianMono_500Medium } from '@expo-google-fonts/martian-mono';
import {
  useFonts as useHankenFonts,
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';
import { PERCENT_STEP_BASES, PAIR_CATALOG, dictionaries, fmtNum, pairKey, tensionOf, type Locale, type Threshold } from '@tresh/shared';

import { COLORS, FONTS } from './src/lib/theme';
import { loadThresholds, saveThresholds } from './src/lib/storage';
import { clearNotifLog, logNotifLocal, readNotifLog, type NotifLogEntry } from './src/lib/notifLog';
import { useRates } from './src/hooks/useRates';
import { enablePush, syncMobileThresholds } from './src/lib/push';
import { LiveActivity } from './modules/live-activity';
import WaterBackground from './src/components/WaterBackground';
import { useTilt } from './src/hooks/useTilt';
import ErrorBoundary from './src/components/ErrorBoundary';
import SwipeBack from './src/components/SwipeBack';
import { BellIcon, ChevronLeftIcon, CloseIcon, HomeIcon } from './src/components/Icons';
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

/** Alt panelin ekran yüksekliğine oranı — okuma bloğunun üst sınırı da buna bağlı.
 *  Ana ekranda su seviyesi görselinin görünür kalması için düşük tutulur; "set" ekranı
 *  üstteki okuma bloğuyla çakışmayacak kadar yüksek, "notifications" ekranında okuma
 *  bloğu zaten panelin arkasında kaldığından en yüksek orana çıkabilir — amaç, tipik
 *  içerikte hiçbir ekranın scroll gerektirmemesi. */
const PANEL_HEIGHT_RATIO_HOME = 0.66;
const PANEL_HEIGHT_RATIO_SET = 0.76;
const PANEL_HEIGHT_RATIO_NOTIFICATIONS = 0.86;

export default function App() {
  return (
    <ErrorBoundary>
      <FontGate />
    </ErrorBoundary>
  );
}

/** Fontlar hazır olana kadar App'i geciktirir — ErrorBoundary'nin
 *  içinde çalışır ki render sırasında atılan herhangi bir hata (yalnızca
 *  sonsuz "hazır değil" durumu değil) de artık beyaz ekran yerine
 *  görünür bir hata mesajına dönüşsün. */
function FontGate() {
  // DİKKAT: useFonts'un ikinci elemanı (hata) önceden yok sayılıyordu —
  // font yüklemesi herhangi bir sebeple hata verirse `loaded` hiç true
  // olmuyor, "fontsReady" sonsuza dek false kalıyor ve aşağıdaki
  // `return null` kalıcı beyaz ekrana dönüşüyordu (ErrorBoundary bunu
  // yakalayamaz, çünkü atılan bir render hatası değil). Artık hata da
  // "hazır" sayılıyor — o zaman sistem fontuna sessizce düşülür.
  const [bricolageLoaded, bricolageError] = useBricolageFonts({ BricolageGrotesque_400Regular, BricolageGrotesque_600SemiBold });
  const [martianLoaded, martianError] = useMartianFonts({ MartianMono_400Regular, MartianMono_500Medium });
  const [hankenLoaded, hankenError] = useHankenFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
  });
  const fontsReady =
    (bricolageLoaded || !!bricolageError) && (martianLoaded || !!martianError) && (hankenLoaded || !!hankenError);

  // Ek güvenlik ağı: her ne sebeple olursa olsun 4 saniyede hazır
  // olunmazsa yine de uygulamayı göster — sonsuza dek beyaz ekranda
  // kalmaktansa fontsuz açılmak çok daha iyi.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, []);

  const ready = fontsReady || timedOut;

  if (!ready) return null;

  return <AppInner />;
}

function AppInner() {
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
  const onSurfaceY = useCallback((y: number) => {
    setSurfaceY((prev) => (Math.abs(prev - y) > 0.5 ? y : prev));
  }, []);

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
  const defaultOffset = PERCENT_STEP_BASES.has(setCat.base) ? (setLive ?? 0) * 0.015 : Math.pow(10, -setCat.decimals);
  const effNewValue = newValue ?? (setLive != null ? setLive + defaultOffset * (newDir === 'above' ? 1 : -1) : null);

  const selected = thresholds.find((t) => t.id === selectedId) ?? thresholds[0] ?? null;
  const selectedCat = selected ? PAIR_CATALOG.find((p) => p.base === selected.base && p.quote === selected.quote) : null;
  const selectedRate = selected ? rates[pairKey(selected.base, selected.quote)]?.rate ?? null : null;

  const activeCount = thresholds.filter((t) => !t.paused).length;
  const onSetScreen = screen === 'set';
  const tiltDeg = useTilt(screen === 'home');
  const displayCat = onSetScreen ? setCat : selectedCat ?? setCat;
  const displayRate = onSetScreen ? setLive : selectedRate ?? setLive;
  const displayValue = onSetScreen ? effNewValue : selected?.value ?? null;
  const displayDecimals = onSetScreen ? setCat.decimals : selected?.decimals ?? setCat.decimals;

  const span = displayCat?.span ?? 1;
  const center = displayValue ?? displayRate ?? 0;
  const min = center - span / 2;
  const clamp01 = (v: number) => Math.max(0.06, Math.min(0.94, v));
  const level = displayRate != null ? clamp01((displayRate - min) / span) : 0.42;
  const thrLevel = displayValue != null ? clamp01((displayValue - min) / span) : 0.62;
  const tension = displayValue != null && displayRate != null ? tensionOf(displayRate, displayValue, span) : 0;

  // Okuma bloğu, alttaki panelin ARKASINDA kalmamalı — panel ekranın alt
  // %66'sını kaplıyor, dolayısıyla üst sınır panelin üst kenarının bir miktar
  // üstünde tutulur (web'de de aynı "yüzeye tutun ama panele girme" kuralı var).
  const rawPanelHeightRatio =
    screen === 'set' ? PANEL_HEIGHT_RATIO_SET : screen === 'notifications' ? PANEL_HEIGHT_RATIO_NOTIFICATIONS : PANEL_HEIGHT_RATIO_HOME;
  // Panel, üst çubuktaki ana sayfa/zil butonlarının üzerine hiçbir zaman
  // çıkmamalı — panel zIndex'i header'dan yüksek olduğu için örtüşen
  // bölgede dokunuşlar butonlara değil panele gider (butonlar "çalışmaz" görünür).
  const MIN_PANEL_TOP = 128;
  const panelHeightRatio = Math.min(rawPanelHeightRatio, 1 - MIN_PANEL_TOP / win.height);
  const panelTop = win.height * (1 - PANEL_HEIGHT_RATIO_HOME);
  const readoutMaxTop = Math.max(120, panelTop - 150);
  const readoutTop = onSetScreen ? 84 : Math.max(120, Math.min(surfaceY - 150, readoutMaxTop));
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
  /** Tek geri dönüş noktası — hem kenardan kaydırma hem de geri butonları bunu çağırır. */
  const goBack = useCallback(() => {
    setScreen('home');
    setEditingId(null);
    setNewValue(null);
  }, []);
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
        'token-failed': d.pushTokenFailed,
        'sync-failed': d.pushSyncFailed,
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
          onSurfaceY={onSurfaceY}
          tiltDeg={tiltDeg}
        />
        <View pointerEvents="none" style={styles.vignetteTop} />
        <View pointerEvents="none" style={styles.vignetteBottom} />
      </View>

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.header} pointerEvents="box-none">
          {screen === 'home' ? (
            <View>
              <Text style={styles.headerTitle}>Tresh</Text>
              <Text style={styles.headerSubtitle}>{d.levelsWatched(activeCount)}</Text>
            </View>
          ) : (
            <Pressable style={styles.headerBackBtn} onPress={goBack} hitSlop={10} accessibilityLabel={d.back}>
              <ChevronLeftIcon size={18} />
              <Text style={styles.headerBackText}>{d.back}</Text>
            </Pressable>
          )}
          <View style={styles.headerActions}>
            <Pressable
              style={styles.circleBtn}
              onPress={openNotifications}
              hitSlop={8}
              accessibilityLabel={d.notifications}
            >
              <BellIcon />
              {notifLog.length > 0 && <View style={styles.bellDot} />}
            </Pressable>
            <Pressable
              style={styles.circleBtn}
              onPress={() => setScreen('home')}
              hitSlop={8}
              accessibilityLabel={d.home}
            >
              <HomeIcon />
            </Pressable>
          </View>
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
            <View style={styles.bannerDot} />
            <View style={styles.bannerTextCol}>
              <Text style={styles.bannerLabel}>{d.bannerLabel}</Text>
              <Text style={styles.bannerText}>{banner}</Text>
            </View>
            <Pressable onPress={() => setBanner(null)} hitSlop={10} accessibilityLabel={d.close} style={styles.bannerCloseBtn}>
              <CloseIcon size={13} strokeWidth={1.8} />
            </Pressable>
          </View>
        )}
      </SafeAreaView>

      <View pointerEvents="none" style={[styles.panelHighlight, { bottom: `${panelHeightRatio * 100}%`, marginBottom: 4 }]} />

      <View style={[styles.panel, { height: `${panelHeightRatio * 100}%` }]}>
        {/* Liquid Glass (iOS 26): kontrol katmanının içeriğin üzerinde
            gerçek bulanıklıkla yüzmesi gerekiyor — Expo Go'da native
            Liquid Glass API'lerine erişim yok (Dynamic Island'daki gibi
            bir sınır, gerçek build + iOS 26 SDK gerektirir), ama
            expo-blur ile gerçek blur + ince "specular" üst çizgisiyle
            aynı estetiğe olabildiğince yaklaşıyoruz. */}
        <BlurView intensity={42} tint="dark" style={StyleSheet.absoluteFillObject} />
        <View pointerEvents="none" style={styles.panelTint} />
        <SwipeBack enabled={screen !== 'home'} onBack={goBack}>
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
            pushEnabled={pushEnabled}
            pushBusy={pushBusy}
            pushError={pushError}
            onTogglePush={togglePush}
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
        </SwipeBack>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgDeep },
  vignetteTop: { position: 'absolute', left: 0, right: 0, top: 0, height: 140, backgroundColor: 'rgba(5,11,20,0.35)' },
  vignetteBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 220, backgroundColor: 'rgba(5,11,20,0.55)' },
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 2 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, zIndex: 5 },
  headerTitle: { fontFamily: FONTS.headingSemiBold, fontSize: 19, color: COLORS.contentPrimary },
  headerSubtitle: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.contentSecondary, marginTop: 1 },
  headerBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  headerBackText: { fontFamily: FONTS.body, color: COLORS.contentSecondary, fontSize: 14 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  circleBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(11,22,34,0.55)', borderWidth: 1, borderColor: 'rgba(143,165,179,0.22)',
  },
  bellDot: { position: 'absolute', top: 7, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.overflow },
  readout: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  readoutLabel: { fontFamily: FONTS.mono, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: COLORS.contentSecondary, marginBottom: 6 },
  readoutValue: {
    fontFamily: FONTS.mono, letterSpacing: -1.5, color: COLORS.contentPrimary,
    textShadowColor: 'rgba(5,11,20,0.9)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 30,
  },
  readoutToday: { fontFamily: FONTS.mono, marginTop: 8, fontSize: 13, color: COLORS.contentSecondary, textAlign: 'center' },
  banner: {
    position: 'absolute', left: 16, right: 16, top: 76, flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(18,34,54,0.94)', borderWidth: 1, borderColor: 'rgba(255,150,74,0.42)', borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 8,
  },
  bannerDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.overflow, marginTop: 6,
    shadowColor: COLORS.overflow, shadowOpacity: 0.6, shadowRadius: 7, shadowOffset: { width: 0, height: 0 },
  },
  bannerTextCol: { flex: 1 },
  bannerLabel: { fontFamily: FONTS.body, color: COLORS.contentSecondary, fontSize: 11, letterSpacing: 0.6, marginBottom: 2 },
  bannerText: { fontFamily: FONTS.body, color: COLORS.contentPrimary, fontSize: 13, lineHeight: 18 },
  bannerCloseBtn: { paddingHorizontal: 4, paddingTop: 3 },
  panel: {
    position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 3,
    borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderBottomWidth: 0, borderTopWidth: 0,
    paddingTop: 18, paddingBottom: 28,
  },
  panelTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(4,9,14,0.5)' },
  panelHighlight: {
    position: 'absolute', left: 40, right: 40, zIndex: 4, height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 1,
  },
});
