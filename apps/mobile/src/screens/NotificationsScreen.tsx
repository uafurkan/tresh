import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AppDict } from '@tresh/shared';
import { COLORS } from '../lib/theme';
import type { NotifLogEntry } from '../lib/notifLog';

interface Props {
  d: AppDict;
  entries: NotifLogEntry[];
  onClearAll: () => void;
}

export default function NotificationsScreen({ d, entries, onClearAll }: Props) {
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
  title: { fontSize: 19, fontWeight: '700', color: COLORS.contentPrimary },
  clearBtn: { borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: 'rgba(255,150,74,0.08)', borderWidth: 1, borderColor: 'rgba(255,150,74,0.4)' },
  clearBtnText: { color: COLORS.overflow, fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: COLORS.contentPrimary, marginBottom: 8, textAlign: 'center' },
  emptyBody: { fontSize: 14, lineHeight: 20, color: COLORS.contentSecondary, textAlign: 'center', maxWidth: 280 },
  card: { borderRadius: 16, padding: 14, marginBottom: 8, backgroundColor: 'rgba(11,22,34,0.6)', borderWidth: 1, borderColor: 'rgba(143,165,179,0.14)' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  cardTitle: { color: COLORS.contentPrimary, fontSize: 14, flex: 1 },
  cardTime: { color: COLORS.contentSecondary, fontSize: 11 },
  cardBody: { color: COLORS.contentSecondary, fontSize: 13, lineHeight: 18, marginTop: 4 },
});
