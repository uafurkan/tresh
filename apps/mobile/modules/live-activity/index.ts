import { Platform } from 'react-native';

interface LiveActivityNative {
  isSupported(): Promise<boolean>;
  areActivitiesEnabled(): Promise<boolean>;
  startOrUpdate(pair: string, rate: number, threshold: number, direction: string, decimals: number): Promise<void>;
  end(): Promise<void>;
}

let native: LiveActivityNative | null = null;
if (Platform.OS === 'ios') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { requireNativeModule } = require('expo-modules-core');
    native = requireNativeModule('LiveActivity');
  } catch {
    // Expo prebuild yapılmadan (Expo Go içinde) bu modül mevcut olmaz —
    // sessizce no-op'a düş, uygulamanın geri kalanı etkilenmesin.
    native = null;
  }
}

/**
 * Dynamic Island / Live Activity için tek giriş noktası. Android'de ve
 * modül henüz derlenmediyse (Expo Go, ya da prebuild öncesi) no-op'tur —
 * çağıran kod platform kontrolü yapmak zorunda kalmaz.
 */
export const LiveActivity = {
  async isSupported(): Promise<boolean> {
    if (!native) return false;
    try {
      return await native.isSupported();
    } catch {
      return false;
    }
  },
  async startOrUpdate(pair: string, rate: number, threshold: number, direction: 'above' | 'below', decimals: number): Promise<void> {
    if (!native) return;
    try {
      await native.startOrUpdate(pair, rate, threshold, direction, decimals);
    } catch {
      /* sessizce geç */
    }
  },
  async end(): Promise<void> {
    if (!native) return;
    try {
      await native.end();
    } catch {
      /* sessizce geç */
    }
  },
};
