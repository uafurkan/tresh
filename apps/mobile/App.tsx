import { StatusBar } from 'expo-status-bar';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { PAIR_CATALOG, dictionaries, type Locale } from '@tresh/shared';

// TODO (Faz 3-4): cihaz dili + AsyncStorage'dan kullanıcı tercihi okunacak.
const locale: Locale = 'tr';
const d = dictionaries[locale].app;

const COLORS = {
  bgDeep: '#04090E',
  bgSurface: '#0B1622',
  bgRaised: '#122236',
  contentPrimary: '#E8F1F5',
  contentSecondary: '#8FA5B3',
  water: '#34E3D6',
  overflow: '#FF9647',
};

export default function App() {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Text style={styles.title}>Tresh</Text>
      <Text style={styles.subtitle}>
        {locale === 'tr' ? 'Takip edebileceğin pariteler' : 'Pairs you can watch'}
      </Text>
      <FlatList
        style={styles.list}
        data={PAIR_CATALOG}
        keyExtractor={(p) => `${p.base}/${p.quote}`}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowText}>{item.base}/{item.quote}</Text>
          </View>
        )}
      />
      <Text style={styles.footer}>
        {/* Faz 2: iskelet — gerçek kur akışı, eşik ekranı ve bildirimler sonraki fazlarda */}
        {d.home} · v0.1 (skeleton)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
    paddingTop: 64,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.contentPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.contentSecondary,
    marginTop: 4,
    marginBottom: 20,
  },
  list: {
    flex: 1,
  },
  row: {
    backgroundColor: COLORS.bgRaised,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  rowText: {
    color: COLORS.water,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    color: COLORS.contentSecondary,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
