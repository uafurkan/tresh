import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import type { AppDict } from '@tresh/shared';
import { COLORS, FONTS } from '../lib/theme';
import type { NotifLogEntry } from '../lib/notifLog';

interface Props {
  d: AppDict;
  entries: NotifLogEntry[];
  onClearAll: () => void;
  pushEnabled: boolean;
  pushBusy: boolean;
  pushError: string | null;
  onTogglePush: () => void;
}

export default function NotificationsScreen({ d, entries, onClearAll, pushEnabled, pushBusy, pushError, onTogglePush }: Props) {
  const relTime = (ts: number) => {
    const diffMin = Math.max(0, Math.round((Date.now() - ts) / 60000));
    if (diffMin < 1) return d.justNow;
    if (diffMin < 60) return d.minutesAgo(diffMin);
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return d.hoursAgo(diffH);
    return d.daysAgo(Math.round(diffH / 24));
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>{d.notifTitle}</Text>
        {entries.length > 0 && (
          <Pressable style={styles.clearBtn} onPress={onClearAll}>
            <Text style={styles.clearBtnText}>{d.clearAll}</Text>
          </Pressable>
        )}
      </View>

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
              trackColor={{ false: COLORS.bgRaised, true: 'rgba(52,227,214,0.5)' }}
              thumbColor={pushEnabled ? COLORS.water : COLORS.contentSecondary}
            />
          )}
        </View>
        {pushError && <Text style={styles.pushError}>{pushError}</Text>}
      </View>

      {entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{d.notifEmpty}</Text>
          <Text style={styles.emptyBody}>{d.notifEmptyBody}</Text>
        </View>
      ) : (
        <ScrollView>
          {entries.map((n) => (
            <View key={n.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{n.title}</Text>
                <Text style={styles.cardTime}>{relTime(n.ts)}</Text>
              </View>
              <Text style={styles.cardBody}>{n.body}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, marginTop: 8 },
  title: { fontFamily: FONTS.headingSemiBold, fontSize: 19, color: COLORS.contentPrimary },
  clearBtn: { borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: 'rgba(255,150,74,0.08)', borderWidth: 1, borderColor: 'rgba(255,150,74,0.4)' },
  clearBtnText: { fontFamily: FONTS.bodySemiBold, color: COLORS.overflow, fontSize: 12 },
  pushCard: { borderRadius: 16, padding: 14, marginBottom: 16, backgroundColor: COLORS.bgRaised },
  pushRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pushTextCol: { flex: 1 },
  pushTitle: { fontFamily: FONTS.bodySemiBold, color: COLORS.contentPrimary, fontSize: 14 },
  pushBody: { fontFamily: FONTS.body, color: COLORS.contentSecondary, fontSize: 12, marginTop: 2, lineHeight: 16 },
  pushError: { fontFamily: FONTS.body, color: COLORS.overflow, fontSize: 12, marginTop: 8, lineHeight: 16 },
  empty: { alignItems: 'center', paddingTop: 24 },
  emptyTitle: { fontFamily: FONTS.headingRegular, fontSize: 20, color: COLORS.contentPrimary, marginBottom: 8, textAlign: 'center' },
  emptyBody: { fontFamily: FONTS.body, fontSize: 14, lineHeight: 20, color: COLORS.contentSecondary, textAlign: 'center', maxWidth: 280 },
  card: { borderRadius: 16, padding: 14, marginBottom: 8, backgroundColor: 'rgba(11,22,34,0.6)', borderWidth: 1, borderColor: 'rgba(143,165,179,0.14)' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  cardTitle: { fontFamily: FONTS.body, color: COLORS.contentPrimary, fontSize: 14, flex: 1 },
  cardTime: { fontFamily: FONTS.body, color: COLORS.contentSecondary, fontSize: 11 },
  cardBody: { fontFamily: FONTS.body, color: COLORS.contentSecondary, fontSize: 13, lineHeight: 18, marginTop: 4 },
});
