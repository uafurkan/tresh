import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CONVERTER_CURRENCIES, CONVERTER_PAIRS, dictionaries, fmtNum, parseLocaleNumber, type Locale } from '@tresh/shared';
import { COLORS, FONTS } from '../lib/theme';
import { useRates } from '../hooks/useRates';
import { ChevronDownIcon, SwapIcon } from './Icons';

const ALL_CODES = ['USD', ...CONVERTER_CURRENCIES.map((c) => c.code)];

/**
 * Web'in ana sayfasındaki hızlı çevirici widget'ı — web'de olduğu gibi
 * ayrı bir ekran değil, ana ekranın kendi içine gömülü bir bölüm.
 */
export default function ConverterWidget({ locale }: { locale: Locale }) {
  const d = dictionaries[locale].landing;
  const { rates } = useRates(CONVERTER_PAIRS);
  const [amount, setAmount] = useState('1');
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('TRY');
  const [picking, setPicking] = useState<null | 'from' | 'to'>(null);

  const usdValueOf = useMemo(() => {
    const map: Record<string, number | undefined> = { USD: 1 };
    for (const c of CONVERTER_CURRENCIES) {
      const r = rates[c.pair]?.rate;
      if (r == null) continue;
      map[c.code] = c.invert ? 1 / r : r;
    }
    return map;
  }, [rates]);

  const amountNum = parseLocaleNumber(amount);
  const fromUsd = usdValueOf[from];
  const toUsd = usdValueOf[to];
  const converted =
    Number.isFinite(amountNum) && fromUsd != null && toUsd != null ? (amountNum * fromUsd) / toUsd : null;

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <View style={styles.root}>
      <Text style={styles.label}>{d.converterTitle}</Text>

      <View style={styles.field}>
        <TextInput
          style={styles.amountInput}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          selectTextOnFocus
        />
        <Pressable style={styles.codeBtn} onPress={() => setPicking('from')} hitSlop={6}>
          <Text style={styles.codeText}>{from}</Text>
          <ChevronDownIcon size={11} color={COLORS.water} />
        </Pressable>
      </View>

      <Pressable style={styles.swapBtn} onPress={swap} accessibilityLabel={d.converterSwap} hitSlop={8}>
        <SwapIcon />
      </Pressable>

      <View style={styles.field}>
        <Text style={styles.resultText} numberOfLines={1}>
          {converted != null ? fmtNum(converted, 2, locale) : '···'}
        </Text>
        <Pressable style={styles.codeBtn} onPress={() => setPicking('to')} hitSlop={6}>
          <Text style={styles.codeText}>{to}</Text>
          <ChevronDownIcon size={11} color={COLORS.water} />
        </Pressable>
      </View>

      <View style={styles.board}>
        <Text style={styles.label}>{d.boardTitle}</Text>
        {CONVERTER_CURRENCIES.map((c) => {
          const v = usdValueOf[c.code];
          return (
            <View key={c.code} style={styles.boardRow}>
              <Text style={styles.boardCode}>{c.code}</Text>
              <Text style={styles.boardValue}>{v != null ? `$${fmtNum(v, 2, locale)}` : '···'}</Text>
            </View>
          );
        })}
      </View>

      <Modal visible={picking !== null} transparent animationType="fade" onRequestClose={() => setPicking(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPicking(null)}>
          <View style={styles.modalCard}>
            <ScrollView>
              {ALL_CODES.map((code) => {
                const on = picking === 'from' ? code === from : code === to;
                return (
                  <Pressable
                    key={code}
                    style={[styles.modalRow, on && styles.modalRowOn]}
                    onPress={() => {
                      if (picking === 'from') setFrom(code);
                      else setTo(code);
                      setPicking(null);
                    }}
                  >
                    <Text style={[styles.modalRowText, on && styles.modalRowTextOn]}>{code}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: 22 },
  label: { fontFamily: FONTS.body, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: COLORS.contentSecondary, marginBottom: 10 },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(11,22,34,0.7)', borderWidth: 1, borderColor: 'rgba(143,165,179,0.2)',
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
  },
  amountInput: { fontFamily: FONTS.mono, flex: 1, fontSize: 18, color: COLORS.contentPrimary, padding: 0 },
  resultText: { fontFamily: FONTS.mono, flex: 1, fontSize: 18, color: COLORS.contentPrimary },
  codeBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  codeText: { fontFamily: FONTS.monoMedium, color: COLORS.water, fontSize: 14 },
  swapBtn: {
    alignSelf: 'center', width: 36, height: 36, borderRadius: 18, marginVertical: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(11,22,34,0.7)', borderWidth: 1, borderColor: 'rgba(143,165,179,0.2)',
  },
  board: { marginTop: 22, borderTopWidth: 1, borderTopColor: 'rgba(143,165,179,0.12)', paddingTop: 16 },
  boardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  boardCode: { fontFamily: FONTS.mono, color: COLORS.contentSecondary, fontSize: 14 },
  boardValue: { fontFamily: FONTS.mono, color: COLORS.contentPrimary, fontSize: 14 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(4,9,14,0.8)', justifyContent: 'center', paddingHorizontal: 40 },
  modalCard: {
    maxHeight: '60%', backgroundColor: '#0B1622', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(143,165,179,0.2)', paddingVertical: 6,
  },
  modalRow: { paddingVertical: 14, paddingHorizontal: 20 },
  modalRowOn: { backgroundColor: 'rgba(52,227,214,0.1)' },
  modalRowText: { fontFamily: FONTS.mono, color: '#EAF3F6', fontSize: 15, textAlign: 'center' },
  modalRowTextOn: { fontFamily: FONTS.monoMedium, color: COLORS.water },
});
