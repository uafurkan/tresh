import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Locale, Threshold } from '@tresh/shared';
import { API_BASE_URL } from './config';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type EnablePushResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported-device' | 'denied' | 'missing-project-id' | 'token-failed' | 'sync-failed' };

/**
 * İzin ister, Expo push token'ı alır ve sunucuya (mevcut eşiklerle birlikte)
 * kaydeder. EAS projesi henüz kurulmadıysa (app.json'da extra.eas.projectId
 * yok) token alınamaz — bu, "eas init" yapılınca kendiliğinden çözülür.
 */
export async function enablePush(thresholds: Threshold[], locale: Locale): Promise<EnablePushResult> {
  if (!Device.isDevice) return { ok: false, reason: 'unsupported-device' };

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 160, 60, 160],
      lightColor: '#34E3D6',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return { ok: false, reason: 'denied' };

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return { ok: false, reason: 'missing-project-id' };

  let token: string;
  try {
    const res = await Notifications.getExpoPushTokenAsync({ projectId });
    token = res.data;
  } catch {
    return { ok: false, reason: 'token-failed' };
  }

  const synced = await syncMobileSubscription(token, thresholds, locale);
  return synced ? { ok: true } : { ok: false, reason: 'sync-failed' };
}

export async function syncMobileThresholds(thresholds: Threshold[], locale: Locale): Promise<void> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status !== 'granted') return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return;
  try {
    const res = await Notifications.getExpoPushTokenAsync({ projectId });
    await syncMobileSubscription(res.data, thresholds, locale);
  } catch {
    /* sessizce geç — bir sonraki açılışta tekrar denenir */
  }
}

async function syncMobileSubscription(expoPushToken: string, thresholds: Threshold[], locale: Locale): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expoPushToken, thresholds, locale }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** İzin verilmişse geçerli Expo push token'ını döndürür, yoksa null. */
async function currentToken(): Promise<string | null> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status !== 'granted') return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;
  try {
    const res = await Notifications.getExpoPushTokenAsync({ projectId });
    return res.data;
  } catch {
    return null;
  }
}

export type TestPushResult = { ok: true } | { ok: false; reason: 'no-subscription' | 'failed' };

/** Web'deki "Test bildirimi gönder" düğmesinin mobil karşılığı. */
export async function sendTestPush(locale: Locale): Promise<TestPushResult> {
  const token = await currentToken();
  if (!token) return { ok: false, reason: 'no-subscription' };
  try {
    const res = await fetch(`${API_BASE_URL}/api/push/test-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expoPushToken: token, locale }),
    });
    const data = await res.json().catch(() => ({ ok: false }));
    return res.ok && data.ok ? { ok: true } : { ok: false, reason: 'failed' };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

export type CheckNowResult =
  | { ok: true; sent: number }
  | { ok: false; reason: 'no-subscription' | 'not-subscribed' | 'server-error' | 'network'; detail?: string };

/** Web'deki "Eşiklerimi şimdi kontrol et" düğmesinin mobil karşılığı. */
export async function checkNow(): Promise<CheckNowResult> {
  const token = await currentToken();
  if (!token) return { ok: false, reason: 'no-subscription' };
  try {
    const res = await fetch(`${API_BASE_URL}/api/push/check-now`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expoPushToken: token }),
    });
    if (res.status === 404) return { ok: false, reason: 'not-subscribed' };
    const data = await res.json().catch(() => ({ ok: false }));
    if (!res.ok || !data.ok) return { ok: false, reason: 'server-error', detail: data?.message };
    return { ok: true, sent: data.sent ?? 0 };
  } catch {
    return { ok: false, reason: 'network' };
  }
}
