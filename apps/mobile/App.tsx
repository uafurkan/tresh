import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import * as Localization from 'expo-localization';
import { PAIR_CATALOG, dictionaries, fmtNum, pairKey, type Locale, type Threshold } from '@tresh/shared';

import { COLORS } from './src/lib/theme';
import { loadThresholds, saveThresholds } from './src/lib/storage';
import { clearNotifLog, logNotifLocal, readNotifLog, type NotifLogEntry } from './src/lib/notifLog';
import { useRates } from './src/hooks/useRates';
import HomeScreen from './src/screens/HomeScreen';
import SetScreen from './src/screens/SetScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';

type Screen = 'home' | 'set' | 'notifications';

function detectLocale(): Locale {
  const tag = Localization.getLocales()[0]?.languageCode ?? 'en';
  return tag === 'tr' ? 'tr' : 'en';
}

export default function App() {
  const [locale] = useState<Locale>(detectLocale);
  const d = dictionaries[locale].app;

  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [banner, setBanner] = useState<string | null>(null);
  const [notifLog, setNotifLog] = useState<NotifLogEntry[]>([]);

  const [newPairIdx, setNewPairIdx] = useState(0);
  const [newDir, setNewDir] = useState<'above' | 'below'>('above');
  const [newValue, setNewValue] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    // TODO (push fazı): sunucudaki izleyici kaydı da burada güncellenecek —
    // şimdilik eşik geçişleri yalnızca uygulama açıkken tespit ediliyor.
  }, []);

  // Uygulama açıkken eşik geçişi tespiti — web'deki client-side banner mantığıyla aynı.
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
          setTimeout(() => setBanner(null), 6000);
          const entry: NotifLogEntry = { id: `local-${Date.now()}`, title: `Tresh · ${key}`, body: text, ts: Date.now() };
          logNotifLocal(entry);
          setNotifLog((p) => [entry, ...p].slice(0, 60));
        }
      }
      prevRates.current[t.id] = cur;
    }
  }, [rates, thresholds, d, locale]);

  const setCat = PAIR_CATALOG[newPairIdx];
  const setLive = rates[pairKey(setCat.base, setCat.quote)]?.rate ?? null;

  const submitThreshold = () => {
    if (newValue == null && setLive == null) return;
    const defaultOffset = setLive != null ? Math.pow(10, -setCat.decimals) : 0;
    const raw = newValue ?? (setLive != null ? setLive + defaultOffset * (newDir === 'above' ? 1 : -1) : null);
    if (raw == null) return;
    const value = +raw.toFixed(setCat.decimals);
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

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{screen === 'home' ? 'Tresh' : screen === 'set' ? '' : ''}</Text>
        {screen === 'home' && (
          <Pressable style={styles.bellBtn} onPress={openNotifications} hitSlop={8}>
            <Text style={styles.bellGlyph}>🔔</Text>
            {notifLog.length > 0 && <View style={styles.bellDot} />}
          </Pressable>
        )}
      </View>

      {banner && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{banner}</Text>
        </View>
      )}

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
        <NotificationsScreen d={d} entries={notifLog} onClearAll={clearAllNotifications} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgDeep, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.contentPrimary },
  bellBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bgRaised },
  bellGlyph: { fontSize: 16 },
  bellDot: { position: 'absolute', top: 6, right: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.overflow },
  banner: { marginHorizontal: 16, marginBottom: 8, backgroundColor: 'rgba(52,227,214,0.12)', borderWidth: 1, borderColor: 'rgba(52,227,214,0.4)', borderRadius: 14, padding: 12 },
  bannerText: { color: COLORS.contentPrimary, fontSize: 13, lineHeight: 18 },
});
