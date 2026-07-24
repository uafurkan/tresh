import { Component, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../lib/theme';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Prodüksiyon (eas update) bundle'larında React'in varsayılan davranışı
 * hatalı bir alt ağacı sessizce kaldırmak — bu, hiçbir mesaj göstermeyen
 * beyaz bir ekrana yol açar. Bu sınır, gerçek hata mesajını + stack'i
 * ekranda gösterir ki teşhis "tahmin et" yerine "oku" olsun.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('Tresh crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.root}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.title}>Bir şeyler bozuldu</Text>
            <Text style={styles.message}>{this.state.error.message}</Text>
            <Text style={styles.stack}>{this.state.error.stack}</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgDeep, paddingTop: 64 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.overflow, marginBottom: 12 },
  message: { fontSize: 15, color: COLORS.contentPrimary, marginBottom: 16, lineHeight: 22 },
  stack: { fontSize: 11, color: COLORS.contentSecondary, lineHeight: 16 },
});
