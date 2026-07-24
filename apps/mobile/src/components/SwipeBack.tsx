import { useRef, type ReactNode } from 'react';
import { Animated, Dimensions, PanResponder, StyleSheet } from 'react-native';

interface Props {
  /** Geri dönülecek bir ekran var mı — yoksa hareket hiç yakalanmaz. */
  enabled: boolean;
  onBack: () => void;
  children: ReactNode;
}

/** Hareketin "geri" sayılması için gereken yatay mesafe (ekran genişliğinin oranı). */
const COMPLETE_RATIO = 0.32;
/** Sol kenardan kaç px içeride başlayan dokunuşlar hareketi başlatabilir. */
const EDGE_WIDTH = 40;

/**
 * iOS'un kenardan kaydırarak geri gitme hareketini taklit eder. react-navigation
 * yerine PanResponder kullanıyoruz çünkü bu uygulamada ekranlar tam ekran su
 * arka planının üzerindeki sabit bir panelin İÇİNDE yaşıyor — bir stack
 * navigator'ın sahiplenmek isteyeceği düzen değil. Yalnızca panel kayar,
 * arkadaki su olduğu gibi kalır.
 */
export default function SwipeBack({ enabled, onBack, children }: Props) {
  const screenW = Dimensions.get('window').width;
  const tx = useRef(new Animated.Value(0)).current;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gesture) => {
        if (!enabledRef.current) return false;
        // Yalnızca sol kenardan başlayan, belirgin şekilde yatay (dikey
        // kaydırmayı çalmayan) hareketler geri hareketi sayılır.
        return (
          evt.nativeEvent.pageX <= EDGE_WIDTH &&
          gesture.dx > 8 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5
        );
      },
      onPanResponderMove: (_, gesture) => {
        tx.setValue(Math.max(0, gesture.dx));
      },
      onPanResponderRelease: (_, gesture) => {
        const done = gesture.dx > screenW * COMPLETE_RATIO || gesture.vx > 0.5;
        if (done) {
          Animated.timing(tx, { toValue: screenW, duration: 180, useNativeDriver: true }).start(() => {
            tx.setValue(0);
            onBackRef.current();
          });
        } else {
          Animated.spring(tx, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(tx, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      },
    })
  ).current;

  // PanResponder bir kez oluşturulup saklandığı için (her render'da yeniden
  // kurmak hareketi ortasında koparırdı) güncel prop'lara ref üzerinden bakılır.
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: tx }] }]} {...responder.panHandlers}>
      {children}
    </Animated.View>
  );
}
