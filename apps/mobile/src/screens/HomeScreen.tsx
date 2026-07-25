import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import {
  PAIR_CATALOG,
  fmtNum,
  pairKey,
  tensionOf,
  type AppDict,
  type Locale,
  type Threshold,
} from '@tresh/shared';
import { COLORS, FONTS } from '../lib/theme';
import { CloseIcon, PauseIcon, PlayIcon } from '../components/Icons';
import ConverterWidget from '../components/ConverterWidget';
import type { LiveRate } from '../hooks/useRates';

function miniWavePath(level: number, w: number, h: number): string {
  const midY = h * (1 - level) * 0.7 + h * 0.15;
  const parts: string[] = [];
  for (let x = 0; x <= w; x += 4) parts.push(`${x === 0 ? 'M' : 'L'}${x} ${(midY + Math.sin(x * 0.28) * 2.2).toFixed(1)}`);
  return parts.join(' ');
}

interface Props {
  d: AppDict;
  locale: Locale;
  thresholds: Threshold[];
  rates: Record<string, LiveRate>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (t: Threshold) => void;
  onTogglePause: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export default function HomeScreen({ d, locale, thresholds, rates, selectedId, onSelect, onEdit, onTogglePause, onDelete, onAdd }: Props) {
  const isEmpty = thresholds.length === 0;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
      {isEmpty ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{d.emptyTitle}</Text>
          <Text style={styles.emptyBody}>{d.emptyBody}</Text>
        </View>
      ) : (
        <View>
          {thresholds.map((t) => {
            const key = pairKey(t.base, t.quote);
            const live = rates[key]?.rate;
            const cat = PAIR_CATALOG.find((p) => p.base === t.base && p.quote === t.quote);
            const tens = live != null && cat ? tensionOf(live, t.value, cat.span) : 0;
            const dist = live != null ? Math.abs(live - t.value) : null;

            let color: string;
            let status: string;
            let statusColor: string;
            if (t.paused) {
              color = '#5f7585';
              status = d.statusMuted;
              statusColor = '#5f7585';
            } else {
              const dull = [46, 164, 160];
              const vivid = [56, 231, 217];
              color = `rgb(${dull.map((c, i) => Math.round(c + (vivid[i] - c) * tens)).join(',')})`;
              status = tens > 0.72 ? d.statusApproaching : tens > 0.4 ? d.statusWatching : d.statusCalm;
              statusColor = tens > 0.72 ? COLORS.overflow : COLORS.contentSecondary;
            }
            const lvl = live != null && cat ? Math.max(0, Math.min(1, (live - (t.value - cat.span / 2)) / cat.span)) : 0.5;
            const markY = (26 * (1 - 0.5) * 0.7 + 26 * 0.15).toFixed(1);
            const selected = t.id === selectedId;

            return (
              <View
                key={t.id}
                style={[
                  styles.row,
                  { backgroundColor: selected ? 'rgba(18,34,54,0.9)' : 'rgba(11,22,34,0.6)', borderColor: selected ? 'rgba(52,227,214,0.4)' : 'rgba(143,165,179,0.14)', opacity: t.paused ? 0.55 : 1 },
                ]}
              >
                <Pressable
                  style={styles.rowMain}
                  onPress={() => {
                    onSelect(t.id);
                    onEdit(t);
                  }}
                >
                  <Svg width={44} height={22} viewBox="0 0 60 26">
                    <Path d={miniWavePath(lvl, 60, 26)} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
                    <Line x1={0} y1={markY} x2={60} y2={markY} stroke={color} strokeWidth={1} strokeDasharray="2 3" opacity={0.5} />
                  </Svg>
                  <View style={styles.rowTextCol}>
                    <Text style={styles.pairLabel}>{key}</Text>
                    <Text style={styles.pairSub} numberOfLines={1}>
                      {t.dir === 'above' ? d.above : d.below} {fmtNum(t.value, t.decimals, locale)}
                      {!t.paused && dist != null ? d.away(fmtNum(dist, t.decimals, locale)) : ''}
                    </Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={[styles.rowRate, { color }]}>{live != null ? fmtNum(live, t.decimals, locale) : '—'}</Text>
                    <Text style={[styles.rowStatus, { color: statusColor }]}>{status}</Text>
                  </View>
                </Pressable>
                <View style={styles.rowActions}>
                  <Pressable
                    onPress={() => onTogglePause(t.id)}
                    style={styles.iconBtn}
                    hitSlop={8}
                    accessibilityLabel={t.paused ? d.resume : d.mute}
                  >
                    {t.paused ? <PlayIcon /> : <PauseIcon />}
                  </Pressable>
                  <Pressable
                    onPress={() => onDelete(t.id)}
                    style={styles.iconBtn}
                    hitSlop={8}
                    accessibilityLabel={d.deleteThreshold}
                  >
                    <CloseIcon color={COLORS.overflow} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
      <Pressable style={styles.cta} onPress={onAdd}>
        <Text style={styles.ctaText}>{d.setThreshold}</Text>
      </Pressable>
      <ConverterWidget locale={locale} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16 },
  empty: { alignItems: 'center', paddingTop: 32, paddingHorizontal: 16, paddingBottom: 8 },
  emptyTitle: { fontFamily: FONTS.headingSemiBold, fontSize: 22, color: COLORS.contentPrimary, marginBottom: 8, textAlign: 'center' },
  emptyBody: { fontFamily: FONTS.body, fontSize: 14, lineHeight: 20, color: COLORS.contentSecondary, textAlign: 'center', maxWidth: 280 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  rowTextCol: { flex: 1, minWidth: 0 },
  pairLabel: { fontFamily: FONTS.mono, fontSize: 14, color: COLORS.contentPrimary, letterSpacing: 0.3 },
  pairSub: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.contentSecondary, marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  rowRate: { fontFamily: FONTS.mono, fontSize: 14 },
  rowStatus: { fontFamily: FONTS.body, fontSize: 11, marginTop: 2 },
  rowActions: { flexDirection: 'column', gap: 6 },
  iconBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  cta: {
    backgroundColor: COLORS.water,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  ctaText: { fontFamily: FONTS.bodyBold, color: '#04121a', fontSize: 16 },
});
