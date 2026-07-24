import { useEffect, useRef, useState } from 'react';
import { Accelerometer } from 'expo-sensors';

/**
 * Cihazın yatay eksendeki eğimini (roll) derece cinsinden verir — su
 * terazisi efekti için. Yalnızca `enabled` true iken sensöre abone olur
 * (ör. sadece ana ekranda), diğer ekranlarda pil/CPU tüketmez.
 */
export function useTilt(enabled: boolean): number {
  const [deg, setDeg] = useState(0);
  const degRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setDeg(0);
      degRef.current = 0;
      return;
    }
    Accelerometer.setUpdateInterval(60);
    const sub = Accelerometer.addListener(({ x }) => {
      // x: cihaz sağa/sola yatınca -1..1 arası değişir. Su, cihaz eğimine
      // TERS yönde döner (gerçek bir terazi/kabarcık gibi yatay kalmaya
      // çalışır) — bu yüzden işareti ters çeviriyoruz.
      const target = Math.max(-14, Math.min(14, -x * 22));
      degRef.current += (target - degRef.current) * 0.12;
      setDeg(degRef.current);
    });
    return () => sub.remove();
  }, [enabled]);

  return deg;
}
