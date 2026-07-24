import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { CRYPTO_BASES, PAIR_CATALOG, fmtNum, pairKey, parseLocaleNumber, type AppDict, type Locale, type PairDef } from '@tresh/shared';
import { COLORS } from '../lib/theme';
import ThresholdSlider from '../components/ThresholdSlider';
import { ChevronDownIcon, ChevronLeftIcon, ChevronUpIcon } from '../components/Icons';
import { checkNow, sendTestPush, type CheckNowResult } from '../lib/push';

interface Props {
  d: AppDict;
  locale: Locale;
  isEditing: boolean;
  pairIdx: number;
  onSelectPair: (idx: number) => void;
  dir: 'above' | 'below';
  onSelectDir: (dir: 'above' | 'below') => void;
  liveRate: number | null;
  value: number | null;
  onValueChange: (v: number | null) => void;
  onSave: () => void;
  onDelete?: () => void;
  onCancel: () => void;
  pushEnabled: boolean;
  pushBusy: boolean;
  pushError: string | null;
  onTogglePush: () => void;
}

export default function SetScreen({
  d, locale, isEditing, pairIdx, onSelectPair, dir, onSelectDir, liveRate, value, onValueChange,
  onSave, onDelete, onCancel, pushEnabled, pushBusy, pushError, onTogglePush,
}: Props) {
  const [query, setQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'sent' | 'no-subscription' | 'failed'>('idle');
  const [checkStatus, setCheckStatus] = useState<'idle' | 'running' | CheckNowResult>('idle');

  const cat = PAIR_CATALOG[pairIdx];
  const catKey = pairKey(cat.base, cat.quote);

  const defaultOffset = CRYPTO_BASES.has(cat.base) ? (liveRate ?? 0) * 0.015 : Math.pow(10, -cat.decimals);
  const effValue = value ?? (liveRate != null ? liveRate + defaultOffset * (dir === 'above' ? 1 : -1) : null);
  const sliderMin = (liveRate ?? effValue ?? 0) - cat.span / 2;

  const matches = useMemo<PairDef[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PAIR_CATALOG;
    return PAIR_CATALOG.filter(
      (p) =>
        `${p.base}/${p.quote}`.toLowerCase().includes(q) ||
        p.base.toLowerCase().includes(q) ||
        p.quote.toLowerCase().includes(q)
    );
  }, [query]);

  // Büyük rakam alanı: sürükleme sırasında her karede React state'i güncellemek
  // yerine doğrudan TextInput'a yazılır (web'de de aynı sebeple imperative).
  const valueInputRef = useRef<TextInput>(null);
  const [textValue, setTextValue] = useState(effValue != null ? fmtNum(effValue, cat.decimals, locale) : '');
  const editingText = useRef(false);

  useEffect(() => {
    if (editingText.current) return;
    setTextValue(effValue != null ? fmtNum(effValue, cat.decimals, locale) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairIdx, dir, locale, value, liveRate]);

  const onSliderDrag = (v: number) => {
    if (editingText.current) return;
    valueInputRef.current?.setNativeProps({ text: fmtNum(v, cat.decimals, locale) });
  };

  const commitText = (raw: string) => {
    editingText.current = false;
    const n = parseLocaleNumber(raw);
    if (Number.isFinite(n)) {
      const clamped = Math.max(sliderMin, Math.min(sliderMin + cat.span, n));
      onValueChange(clamped);
      setTextValue(fmtNum(clamped, cat.decimals, locale));
    } else if (effValue != null) {
      setTextValue(fmtNum(effValue, cat.decimals, locale));
    }
  };

  const alreadyPast = effValue != null && liveRate != null && (dir === 'above' ? effValue <= liveRate : effValue >= liveRate);

  // Şamandırayı sürüklerken dıştaki sayfa kaymasın — parmağın altındaki
  // gerçek konum kayınca değer sapıtıyordu. scrollEnabled, PanResponder'ın
  // capture-phase yakalamasına ek bir güvenlik katmanı.
  const [scrollLocked, setScrollLocked] = useState(false);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
      scrollEnabled={!scrollLocked}
    >
      <View style={styles.headerRow}>
        <Pressable style={styles.backBtn} onPress={onCancel} hitSlop={10} accessibilityLabel={d.back}>
          <ChevronLeftIcon />
          <Text style={styles.backText}>{d.back}</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>{d.setTitle}</Text>
      <Text style={styles.subtitle}>{isEditing ? d.editSubtitle : d.setSubtitle}</Text>

      <Text style={styles.label}>{d.pair}</Text>
      <Pressable style={[styles.pairButton, pickerOpen && styles.pairButtonOpen]} onPress={() => setPickerOpen((v) => !v)}>
        <Text style={styles.pairButtonText}>{catKey}</Text>
        {pickerOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
      </Pressable>
      {pickerOpen && (
        <View style={styles.pickerBox}>
          <TextInput
            style={styles.searchInput}
            placeholder={d.pairSearchPlaceholder}
            placeholderTextColor={COLORS.contentSecondary}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="characters"
          />
          <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {matches.length === 0 ? (
              <Text style={styles.noMatch}>{d.pairNoMatch}</Text>
            ) : (
              matches.map((p) => {
                const idx = PAIR_CATALOG.indexOf(p);
                const on = idx === pairIdx;
                return (
                  <Pressable
                    key={pairKey(p.base, p.quote)}
                    style={[styles.pickerRow, on && styles.pickerRowOn]}
                    onPress={() => {
                      onSelectPair(idx);
                      onValueChange(null);
                      setPickerOpen(false);
                      setQuery('');
                    }}
                  >
                    <Text style={[styles.pickerRowText, on && styles.pickerRowTextOn]}>{p.base}/{p.quote}</Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      )}

      <Text style={styles.label}>{d.notifyWhen}</Text>
      <View style={styles.dirRow}>
        {(['above', 'below'] as const).map((dr) => {
          const on = dir === dr;
          return (
            <Pressable key={dr} style={[styles.dirBtn, on && styles.dirBtnActive]} onPress={() => onSelectDir(dr)}>
              <Text style={[styles.dirBtnText, on && styles.dirBtnTextActive]}>{dr === 'above' ? d.dirAbove : d.dirBelow}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Web'deki imza etkileşim: solda dikey şamandıra, sağda büyük değer. */}
      <View style={styles.sliderRow}>
        <ThresholdSlider
          min={sliderMin}
          span={cat.span}
          value={effValue}
          onChange={onValueChange}
          onDrag={onSliderDrag}
          onDragStart={() => setScrollLocked(true)}
          onDragEnd={() => setScrollLocked(false)}
          height={210}
        />
        <View style={styles.valueCol}>
          <Text style={styles.label}>{d.threshold}</Text>
          {effValue != null ? (
            <TextInput
              ref={valueInputRef}
              style={styles.valueInput}
              value={textValue}
              onChangeText={setTextValue}
              onFocus={() => { editingText.current = true; }}
              onEndEditing={(e) => commitText(e.nativeEvent.text)}
              onBlur={() => commitText(textValue)}
              keyboardType="decimal-pad"
              returnKeyType="done"
              selectTextOnFocus
            />
          ) : (
            <Text style={styles.valueInput}>· · ·</Text>
          )}
          <Text style={styles.helper}>
            {liveRate != null && effValue != null
              ? d.helper(
                  fmtNum(liveRate, cat.decimals, locale),
                  dir,
                  fmtNum(Math.abs(effValue - liveRate), cat.decimals, locale),
                  alreadyPast
                )
              : d.waitingLive}
          </Text>
        </View>
      </View>

      {/* Push kutusu — web'de de tam bu konumda, ayar ekranının içinde. */}
      <View style={styles.pushCard}>
        <View style={styles.pushRow}>
          <View style={styles.pushTextCol}>
            <Text style={styles.pushTitle}>{d.pushTitle}</Text>
            <Text style={styles.pushBody}>{d.pushSupported}</Text>
          </View>
          {pushBusy ? (
            <ActivityIndicator color={COLORS.water} />
          ) : (
            <Switch
              value={pushEnabled}
              onValueChange={onTogglePush}
              trackColor={{ false: 'rgba(143,165,179,0.3)', true: COLORS.water }}
              thumbColor={COLORS.contentPrimary}
            />
          )}
        </View>
        {pushError && <Text style={styles.pushError}>{pushError}</Text>}

        {pushEnabled && (
          <View style={styles.testRow}>
            <Pressable
              style={[styles.testBtn, testStatus === 'sending' && styles.btnDisabled]}
              disabled={testStatus === 'sending'}
              onPress={async () => {
                setTestStatus('sending');
                const res = await sendTestPush(locale);
                setTestStatus(res.ok ? 'sent' : res.reason);
              }}
            >
              <Text style={styles.testBtnText}>{testStatus === 'sending' ? d.testPushSending : d.sendTestPush}</Text>
            </Pressable>
            <Pressable
              style={[styles.checkBtn, checkStatus === 'running' && styles.btnDisabled]}
              disabled={checkStatus === 'running'}
              onPress={async () => {
                setCheckStatus('running');
                setCheckStatus(await checkNow());
              }}
            >
              <Text style={styles.checkBtnText}>{checkStatus === 'running' ? d.checkNowRunning : d.checkNow}</Text>
            </Pressable>

            {testStatus !== 'idle' && testStatus !== 'sending' && (
              <Text style={[styles.statusText, { color: testStatus === 'sent' ? COLORS.water : COLORS.overflow }]}>
                {testStatus === 'sent' ? d.testPushSent : testStatus === 'no-subscription' ? d.testPushNoSub : d.testPushFailed}
              </Text>
            )}
            {checkStatus !== 'idle' && checkStatus !== 'running' && (
              <Text style={[styles.statusText, { color: checkStatus.ok ? COLORS.water : COLORS.overflow }]}>
                {checkStatus.ok
                  ? d.checkNowResult(checkStatus.sent)
                  : checkStatus.reason === 'no-subscription'
                  ? d.checkNowNoSub
                  : checkStatus.reason === 'not-subscribed'
                  ? d.checkNowNotSubscribed
                  : checkStatus.reason === 'network'
                  ? d.checkNowNetwork
                  : `${d.checkNowServerError}${checkStatus.detail ? ` (${checkStatus.detail})` : ''}`}
              </Text>
            )}
          </View>
        )}
      </View>

      <Pressable style={[styles.saveBtn, effValue == null && styles.btnDisabled]} onPress={onSave} disabled={effValue == null}>
        <Text style={styles.saveBtnText}>{isEditing ? d.updateLevel : d.watchThisLevel}</Text>
      </Pressable>

      {isEditing && onDelete && (
        <Pressable style={styles.deleteBtn} onPress={onDelete}>
          <Text style={styles.deleteBtnText}>{d.deleteThreshold}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16 },
  headerRow: { marginBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: -6, paddingVertical: 4 },
  backText: { color: COLORS.contentSecondary, fontSize: 14 },
  title: { fontSize: 24, fontWeight: '600', color: COLORS.contentPrimary, marginTop: 2 },
  subtitle: { fontSize: 13, color: COLORS.contentSecondary, marginTop: 4, marginBottom: 18, lineHeight: 18 },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: COLORS.contentSecondary, marginBottom: 8 },
  pairButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(11,22,34,0.5)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(143,165,179,0.16)',
    paddingVertical: 13, paddingHorizontal: 14, marginBottom: 16,
  },
  pairButtonOpen: { borderColor: 'rgba(52,227,214,0.5)' },
  pairButtonText: { color: '#EAF3F6', fontSize: 15 },
  pickerBox: {
    backgroundColor: '#0B1622', borderRadius: 12, padding: 6, marginTop: -8, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(143,165,179,0.2)',
  },
  searchInput: {
    color: COLORS.contentPrimary, fontSize: 14, paddingVertical: 10, paddingHorizontal: 10,
    backgroundColor: 'rgba(18,34,54,0.6)', borderRadius: 10, marginBottom: 4,
  },
  noMatch: { color: COLORS.contentSecondary, fontSize: 13, paddingHorizontal: 14, paddingVertical: 12 },
  pickerRow: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8 },
  pickerRowOn: { backgroundColor: 'rgba(52,227,214,0.1)' },
  pickerRowText: { color: '#EAF3F6', fontSize: 14 },
  pickerRowTextOn: { color: COLORS.water },
  dirRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  dirBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center',
    backgroundColor: 'rgba(11,22,34,0.5)', borderWidth: 1, borderColor: 'rgba(143,165,179,0.16)',
  },
  dirBtnActive: { backgroundColor: 'rgba(52,227,214,0.14)', borderColor: 'rgba(52,227,214,0.5)' },
  dirBtnText: { color: COLORS.contentSecondary, fontSize: 14 },
  dirBtnTextActive: { color: COLORS.water },
  sliderRow: { flexDirection: 'row', gap: 18, marginBottom: 20 },
  valueCol: { flex: 1, justifyContent: 'center' },
  valueInput: {
    fontSize: 42, fontWeight: '500', color: COLORS.contentPrimary, padding: 0, lineHeight: 48,
  },
  helper: { marginTop: 8, fontSize: 13, lineHeight: 18, color: COLORS.contentSecondary },
  pushCard: {
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(143,165,179,0.15)',
    backgroundColor: 'rgba(11,22,34,0.55)', padding: 14, marginBottom: 16,
  },
  pushRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pushTextCol: { flex: 1 },
  pushTitle: { color: COLORS.contentPrimary, fontSize: 13 },
  pushBody: { color: COLORS.contentSecondary, fontSize: 11.5, marginTop: 4, lineHeight: 16 },
  pushError: { color: COLORS.overflow, fontSize: 11.5, marginTop: 8, lineHeight: 16 },
  testRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  testBtn: {
    borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12,
    borderWidth: 1, borderColor: 'rgba(52,227,214,0.4)', backgroundColor: 'rgba(52,227,214,0.08)',
  },
  testBtnText: { color: COLORS.water, fontSize: 12 },
  checkBtn: {
    borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12,
    borderWidth: 1, borderColor: 'rgba(255,150,74,0.4)', backgroundColor: 'rgba(255,150,74,0.08)',
  },
  checkBtnText: { color: COLORS.overflow, fontSize: 12 },
  statusText: { width: '100%', fontSize: 11.5, lineHeight: 16 },
  btnDisabled: { opacity: 0.5 },
  saveBtn: { backgroundColor: COLORS.water, borderRadius: 20, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#04121a', fontSize: 16, fontWeight: '700' },
  deleteBtn: {
    marginTop: 10, paddingVertical: 14, borderRadius: 16, alignItems: 'center',
    backgroundColor: 'rgba(255,150,74,0.1)', borderWidth: 1, borderColor: 'rgba(255,150,74,0.3)',
  },
  deleteBtnText: { color: COLORS.overflow, fontSize: 14, fontWeight: '600' },
});
