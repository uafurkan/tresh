import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { COLORS } from '../lib/theme';

interface Props {
  /** Çubuğun en altına karşılık gelen değer. */
  min: number;
  /** Çubuğun kapsadığı toplam değer aralığı. */
  span: number;
  value: number | null;
  onChange: (v: number) => void;
  /** Sürükleme sırasında (her karede) çağrılır — büyük rakamı anlık güncellemek için. */
  onDrag?: (v: number) => void;
  /** Sürükleme başlarken/biterken — dıştaki ScrollView'ı geçici kapatmak için. */
  onDragStart?: () => void;
  onDragEnd?: () => void;
  height?: number;
}

/**
 * Web'deki dikey eşik çubuğunun (SetPanel içindeki trackRef/fillRef/floatRef
 * üçlüsü) React Native karşılığı: dolan su + sürüklenebilir şamandıra.
 * Dokunulan noktaya atlar, sonra parmakla birlikte sürüklenir.
 */
export default function ThresholdSlider({ min, span, value, onChange, onDrag, onDragStart, onDragEnd, height = 200 }: Props) {
  const [trackH, setTrackH] = useState(height);
  const trackHRef = useRef(height);
  const onLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    trackHRef.current = h;
    setTrackH(h);
  };

  // PanResponder bir kez kurulur (her render'da yeniden kurmak sürüklemeyi
  // ortasında koparırdı), güncel değerlere ref üzerinden bakılır.
  const minRef = useRef(min);
  minRef.current = min;
  const spanRef = useRef(span);
  spanRef.current = span;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onDragRef = useRef(onDrag);
  onDragRef.current = onDrag;
  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  const valueFromY = (y: number): number => {
    const h = trackHRef.current || 1;
    const ratio = Math.max(0, Math.min(1, 1 - y / h));
    return minRef.current + ratio * spanRef.current;
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        // "Capture" varyantları, dokunuşu asıl sahibinden (burada dıştaki
        // ScrollView) ÖNCE, yayılma aşamasının en başında yakalar — bunlar
        // olmadan ScrollView bazen aynı anda kaydırmayı da başlatıyor,
        // parmağın altındaki gerçek konum kayıp değer sapıtıyordu.
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: (evt) => {
          onDragStartRef.current?.();
          const v = valueFromY(evt.nativeEvent.locationY);
          onDragRef.current?.(v);
          onChangeRef.current(v);
        },
        onPanResponderMove: (evt) => {
          const v = valueFromY(evt.nativeEvent.locationY);
          onDragRef.current?.(v);
          onChangeRef.current(v);
        },
        onPanResponderRelease: () => onDragEndRef.current?.(),
        onPanResponderTerminate: () => onDragEndRef.current?.(),
      }),
    []
  );

  const fillPct = value != null ? Math.max(0, Math.min(100, ((value - min) / span) * 100)) : 50;

  return (
    <View style={[styles.track, { height }]} onLayout={onLayout} {...responder.panHandlers}>
      <View style={[styles.fill, { height: `${fillPct}%` }]} />
      <View style={[styles.float, { top: trackH * (1 - fillPct / 100) - 17 }]}>
        <View style={styles.grip} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 76,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(143,165,179,0.15)',
    backgroundColor: '#0B1622',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(52,227,214,0.18)',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(52,227,214,0.7)',
  },
  float: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 34,
    borderRadius: 12,
    backgroundColor: COLORS.water,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.water,
    shadowOpacity: 0.7,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  grip: { height: 3, width: 22, borderRadius: 2, backgroundColor: 'rgba(4,18,26,0.4)' },
});
