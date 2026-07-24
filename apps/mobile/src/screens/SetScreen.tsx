import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CRYPTO_BASES, PAIR_CATALOG, fmtNum, pairKey, parseLocaleNumber, type AppDict, type Locale, type PairDef } from '@tresh/shared';
import { COLORS } from '../lib/theme';

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
}

export default function SetScreen({
  d, locale, isEditing, pairIdx, onSelectPair, dir, onSelectDir, liveRate, value, onValueChange, onSave, onDelete, onCancel,
}: Props) {
  const [query, setQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const cat = PAIR_CATALOG[pairIdx];
  const catKey = pairKey(cat.base, cat.quote);

  const defaultOffset = CRYPTO_BASES.has(cat.base) ? (liveRate ?? 0) * 0.015 : Math.pow(10, -cat.decimals);
  const effValue = value ?? (liveRate != null ? liveRate + defaultOffset * (dir === 'above' ? 1 : -1) : null);
  const step = CRYPTO_BASES.has(cat.base) ? Math.max(cat.span * 0.002, Math.pow(10, -cat.decimals)) : Math.pow(10, -cat.decimals);

  const matches = useMemo<PairDef[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PAIR_CATALOG;
    return PAIR_CATALOG.filter((p) => `${p.base}/${p.quote}`.toLowerCase().includes(q) || p.base.toLowerCase().includes(q) || p.quote.toLowerCase().includes(q));
  }, [query]);

  const [textValue, setTextValue] = useState(effValue != null ? fmtNum(effValue, cat.decimals, locale) : '');

  // Parite veya yön değişince (kullanıcı elle bir şey yazmadıysa) alandaki
  // metni güncel varsayılan değere senkronize et.
  useEffect(() => {
    setTextValue(effValue != null ? fmtNum(effValue, cat.decimals, locale) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairIdx, dir, locale]);

  const commitText = (raw: string) => {
    const n = parseLocaleNumber(raw);
    if (Number.isFinite(n)) onValueChange(n);
  };

  const bump = (mult: number) => {
    const base = effValue ?? liveRate ?? 0;
    const next = +(base + step * mult).toFixed(cat.decimals);
    onValueChange(next);
    setTextValue(fmtNum(next, cat.decimals, locale));
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{isEditing ? d.updateLevel : d.setThreshold}</Text>
      <Text style={styles.subtitle}>{isEditing ? d.editSubtitle : d.setSubtitle}</Text>

      <Text style={styles.label}>{d.pair}</Text>
      <Pressable style={styles.pairButton} onPress={() => setPickerOpen((v) => !v)}>
        <Text style={styles.pairButtonText}>{catKey}</Text>
        <Text style={styles.pairButtonChevron}>{pickerOpen ? '▲' : '▼'}</Text>
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
          <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
            {matches.length === 0 ? (
              <Text style={styles.noMatch}>{d.pairNoMatch}</Text>
            ) : (
              matches.map((p) => {
                const idx = PAIR_CATALOG.indexOf(p);
                return (
                  <Pressable
                    key={pairKey(p.base, p.quote)}
                    style={styles.pickerRow}
                    onPress={() => {
                      onSelectPair(idx);
                      onValueChange(null);
                      setPickerOpen(false);
                      setQuery('');
                    }}
                  >
                    <Text style={styles.pickerRowText}>{p.base}/{p.quote}</Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      )}

      <Text style={styles.label}>{d.notifyWhen}</Text>
      <View style={styles.dirRow}>
        <Pressable style={[styles.dirBtn, dir === 'above' && styles.dirBtnActive]} onPress={() => onSelectDir('above')}>
          <Text style={[styles.dirBtnText, dir === 'above' && styles.dirBtnTextActive]}>{d.dirAbove}</Text>
        </Pressable>
        <Pressable style={[styles.dirBtn, dir === 'below' && styles.dirBtnActive]} onPress={() => onSelectDir('below')}>
          <Text style={[styles.dirBtnText, dir === 'below' && styles.dirBtnTextActive]}>{d.dirBelow}</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>{d.thresholdValue}</Text>
      <Pressable
        onPress={() => {
          if (liveRate != null) {
            onValueChange(liveRate);
            setTextValue(fmtNum(liveRate, cat.decimals, locale));
          }
        }}
        style={styles.liveRateRow}
      >
        <Text style={styles.liveRateLabel}>{liveRate != null ? d.useCurrentRate : d.waitingLive}</Text>
        <Text style={styles.liveRateValue}>{liveRate != null ? fmtNum(liveRate, cat.decimals, locale) : '· · ·'}</Text>
      </Pressable>

      <View style={styles.stepperRow}>
        <Pressable style={styles.stepBtn} onPress={() => bump(-1)}>
          <Text style={styles.stepBtnText}>–</Text>
        </Pressable>
        <TextInput
          style={styles.valueInput}
          value={textValue}
          onChangeText={setTextValue}
          onEndEditing={() => commitText(textValue)}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={COLORS.contentSecondary}
        />
        <Pressable style={styles.stepBtn} onPress={() => bump(1)}>
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>

      <Pressable style={styles.saveBtn} onPress={onSave} disabled={effValue == null}>
        <Text style={styles.saveBtnText}>{isEditing ? d.updateLevel : d.watchThisLevel}</Text>
      </Pressable>

      <View style={styles.bottomRow}>
        <Pressable style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>{d.back}</Text>
        </Pressable>
        {isEditing && onDelete && (
          <Pressable style={styles.deleteBtn} onPress={onDelete}>
            <Text style={styles.deleteBtnText}>{d.deleteThreshold}</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.contentPrimary, marginTop: 8 },
  subtitle: { fontSize: 13, color: COLORS.contentSecondary, marginTop: 4, marginBottom: 20, lineHeight: 18 },
  label: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: COLORS.contentSecondary, marginBottom: 8, marginTop: 4 },
  pairButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.bgRaised, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 16,
  },
  pairButtonText: { color: COLORS.contentPrimary, fontSize: 16, fontWeight: '600' },
  pairButtonChevron: { color: COLORS.contentSecondary, fontSize: 12 },
  pickerBox: { backgroundColor: COLORS.bgSurface, borderRadius: 14, padding: 8, marginTop: -8, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(143,165,179,0.14)' },
  searchInput: { color: COLORS.contentPrimary, fontSize: 14, paddingVertical: 10, paddingHorizontal: 10, backgroundColor: COLORS.bgRaised, borderRadius: 10, marginBottom: 6 },
  noMatch: { color: COLORS.contentSecondary, fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  pickerRow: { paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10 },
  pickerRowText: { color: COLORS.contentPrimary, fontSize: 14 },
  dirRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  dirBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.bgRaised, borderWidth: 1, borderColor: 'transparent' },
  dirBtnActive: { backgroundColor: 'rgba(52,227,214,0.15)', borderColor: 'rgba(52,227,214,0.5)' },
  dirBtnText: { color: COLORS.contentSecondary, fontSize: 14, fontWeight: '600' },
  dirBtnTextActive: { color: COLORS.water },
  liveRateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.bgRaised, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 12,
  },
  liveRateLabel: { color: COLORS.contentSecondary, fontSize: 13 },
  liveRateValue: { color: COLORS.water, fontSize: 16, fontWeight: '600' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  stepBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.bgRaised, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { color: COLORS.contentPrimary, fontSize: 22, fontWeight: '600' },
  valueInput: {
    flex: 1, textAlign: 'center', fontSize: 28, fontWeight: '500', color: COLORS.contentPrimary,
    backgroundColor: COLORS.bgSurface, borderRadius: 16, paddingVertical: 14,
  },
  saveBtn: { backgroundColor: COLORS.water, borderRadius: 20, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  saveBtnText: { color: '#04121a', fontSize: 16, fontWeight: '700' },
  bottomRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', backgroundColor: COLORS.bgRaised },
  cancelBtnText: { color: COLORS.contentSecondary, fontSize: 14, fontWeight: '600' },
  deleteBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', backgroundColor: 'rgba(255,150,74,0.1)', borderWidth: 1, borderColor: 'rgba(255,150,74,0.3)' },
  deleteBtnText: { color: COLORS.overflow, fontSize: 14, fontWeight: '600' },
});
