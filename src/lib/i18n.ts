export const locales = ['en', 'tr'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export function isLocale(v: string): v is Locale {
  return (locales as readonly string[]).includes(v);
}

/** Locale'e göre yol üretir: en önek almaz, tr '/tr' altındadır. */
export function localePath(locale: Locale, path: string): string {
  const p = path === '/' ? '' : path;
  return locale === defaultLocale ? (p || '/') : `/tr${p}`;
}

interface MetaDict {
  title: string;
  titleApp: string;
  description: string;
  descriptionApp: string;
  tagline: string;
  ogLocale: string;
  jsonLdDescription: string;
}

interface LandingDict {
  openApp: string;
  h1: string;
  lede: string;
  cta: string;
  cards: [string, string][];
  langSwitch: string;
}

export interface AppDict {
  home: string;
  levelsWatched: (n: number) => string;
  back: string;
  yourLevels: string;
  emptyTitle: string;
  emptyBody: string;
  setThreshold: string;
  watchThisLevel: string;
  statusMuted: string;
  statusApproaching: string;
  statusWatching: string;
  statusCalm: string;
  above: string;
  below: string;
  away: (d: string) => string;
  resume: string;
  mute: string;
  deleteThreshold: string;
  setTitle: string;
  setSubtitle: string;
  pair: string;
  notifyWhen: string;
  dirAbove: string;
  dirBelow: string;
  threshold: string;
  thresholdValue: string;
  helper: (now: string, dir: 'above' | 'below', diff: string | null, alreadyPast: boolean) => string;
  waitingLive: string;
  pushTitle: string;
  pushAria: string;
  pushSupported: string;
  pushUnsupported: string;
  pushDenied: string;
  pushMissingConfig: string;
  pushFailed: string;
  bannerLabel: string;
  bannerText: (key: string, value: string, dir: 'above' | 'below', current: string) => string;
  close: string;
  errorTitle: string;
  errorBody: string;
  reconnect: string;
  today: (diff: string, dir: 'above' | 'below', value: string) => string;
}

export interface Dict {
  meta: MetaDict;
  landing: LandingDict;
  app: AppDict;
}

export const dictionaries: Record<Locale, Dict> = {
  en: {
    meta: {
      title: 'Tresh — Currency threshold alerts',
      titleApp: 'App',
      description:
        'Pick a pair and a limit; get a push notification the moment the live rate crosses it — even with the app closed. Tell me when it hits my number, I don’t want to babysit charts.',
      descriptionApp: 'Watch the live rate level, set your threshold, get notified when the line breaks.',
      tagline: 'Tell me when it hits my number, I don’t want to babysit charts.',
      ogLocale: 'en_US',
      jsonLdDescription:
        'Currency threshold-alert app. Get a push notification when the rate crosses the level you set.',
    },
    landing: {
      openApp: 'Open the app',
      h1: 'Tell me when it hits my number. I don’t want to babysit charts.',
      lede:
        'Pick a pair and a limit — say USD/TRY 35.00. The moment the live rate crosses your line, a quiet notification lands on your phone, even with the app closed. Don’t wait by the screen; the water watches the level for you.',
      cta: 'Set your threshold',
      cards: [
        ['Live level', 'The rate flows as a layered water surface; the closer it gets to your line, the livelier the water.'],
        ['One notification', 'When the line breaks, we tell you once, in one plain sentence. No alarm chains.'],
        ['Even when closed', 'Web Push keeps watching the level while the tab is closed — and reaches you.'],
      ],
      langSwitch: 'Türkçe',
    },
    app: {
      home: 'Home',
      levelsWatched: (n) => `${n} level${n === 1 ? '' : 's'} watched`,
      back: 'Back',
      yourLevels: 'Your levels',
      emptyTitle: 'Still water.',
      emptyBody: 'Set your first threshold; we’ll watch the level for you — even while you’re away.',
      setThreshold: 'Set a threshold',
      watchThisLevel: 'Watch this level',
      statusMuted: 'Muted',
      statusApproaching: 'Approaching',
      statusWatching: 'Watching',
      statusCalm: 'Calm',
      above: 'Above',
      below: 'Below',
      away: (d) => ` · ${d} away`,
      resume: 'Resume watching',
      mute: 'Mute',
      deleteThreshold: 'Delete threshold',
      setTitle: 'Where is your line?',
      setSubtitle: 'Drag the float to the level you care about.',
      pair: 'Pair',
      notifyWhen: 'Notify me when',
      dirAbove: 'If it rises above',
      dirBelow: 'If it falls below',
      threshold: 'Threshold',
      thresholdValue: 'Threshold value',
      helper: (now, dir, diff, alreadyPast) =>
        `Now ${now}. ${
          alreadyPast
            ? dir === 'above' ? 'Already above it.' : 'Already below it.'
            : dir === 'above' ? `${diff} of climb to go.` : `${diff} of drop to go.`
        }`,
      waitingLive: 'Waiting for the live rate…',
      pushTitle: 'Push notifications',
      pushAria: 'Allow push notifications',
      pushSupported: 'So we can reach you the moment the level breaks — even with the app closed.',
      pushUnsupported: 'This browser doesn’t support push; we’ll still notify you while the app is open.',
      pushDenied: 'Notifications are blocked for this site. Allow them in your browser’s site settings, then try again.',
      pushMissingConfig: 'Push isn’t configured on this deployment yet.',
      pushFailed: 'Couldn’t enable push right now — try again in a moment.',
      bannerLabel: 'Threshold crossed',
      bannerText: (key, value, dir, current) =>
        dir === 'above'
          ? `${key} crossed ${value} — now ${current}.`
          : `${key} broke below ${value} — now ${current}.`,
      close: 'Close',
      errorTitle: 'Signal lost',
      errorBody:
        'Rates are paused — holding the last reading. We’ll pick up right where we left off as soon as the connection returns.',
      reconnect: 'Reconnect',
      today: (diff, dir, value) => `${diff} today · ${dir === 'above' ? 'above' : 'below'} ${value}`,
    },
  },
  tr: {
    meta: {
      title: 'Tresh — Döviz eşik alarmı',
      titleApp: 'Uygulama',
      description:
        'Bir parite ve limit seç; canlı kur limitini geçtiğinde — uygulama kapalı olsa bile — bildirim al. Sayım tutunca haber ver, grafiğe dadanmak istemiyorum.',
      descriptionApp: 'Canlı kur seviyesini izle, eşiğini kur, seviye kırılınca bildirim al.',
      tagline: 'Sayım tutunca haber ver, grafiğe dadanmak istemiyorum.',
      ogLocale: 'tr_TR',
      jsonLdDescription:
        'Döviz kuru eşik-alarm uygulaması. Kur, belirlediğin seviyeyi geçince push bildirimi alırsın.',
    },
    landing: {
      openApp: 'Uygulamayı aç',
      h1: 'Sayım tutunca haber ver, grafiğe dadanmak istemiyorum.',
      lede:
        'Bir parite ve limit seç — örneğin USD/TRY 35.00. Canlı kur çizgini geçtiği an, uygulama kapalı olsa bile, telefonuna sade bir bildirim düşer. Ekran başında bekleme; su seviyeyi senin yerine izler.',
      cta: 'Eşiğini belirle',
      cards: [
        ['Canlı seviye', 'Kur, katmanlı bir su yüzeyi olarak akar; eşiğine yaklaştıkça su canlanır.'],
        ['Tek bildirim', 'Çizgi kırıldığında bir kez, sade bir cümleyle haber veririz. Alarm zinciri yok.'],
        ['Kapalıyken bile', 'Web Push sayesinde sekme kapalıyken de seviye izlenir, sana ulaşırız.'],
      ],
      langSwitch: 'English',
    },
    app: {
      home: 'Ana sayfa',
      levelsWatched: (n) => `${n} seviye izleniyor`,
      back: 'Geri',
      yourLevels: 'Seviyelerin',
      emptyTitle: 'Durgun su.',
      emptyBody: 'İlk eşiğini kur; seviyeyi senin yerine biz izleyelim — sen uzaktayken bile.',
      setThreshold: 'Eşik belirle',
      watchThisLevel: 'Bu seviyeyi izle',
      statusMuted: 'Susturuldu',
      statusApproaching: 'Yaklaşıyor',
      statusWatching: 'İzleniyor',
      statusCalm: 'Sakin',
      above: 'Üstü',
      below: 'Altı',
      away: (d) => ` · ${d} uzakta`,
      resume: 'İzlemeyi sürdür',
      mute: 'Sustur',
      deleteThreshold: 'Eşiği sil',
      setTitle: 'Çizgin nerede?',
      setSubtitle: 'Şamandırayı önemsediğin seviyeye sürükle.',
      pair: 'Parite',
      notifyWhen: 'Haber ver, kur',
      dirAbove: 'Üstüne çıkarsa',
      dirBelow: 'Altına düşerse',
      threshold: 'Eşik',
      thresholdValue: 'Eşik değeri',
      helper: (now, dir, diff, alreadyPast) =>
        `Şu an ${now}. ${
          alreadyPast
            ? dir === 'above' ? 'Zaten üstünde.' : 'Zaten altında.'
            : dir === 'above' ? `Tırmanacak ${diff} var.` : `Düşecek ${diff} var.`
        }`,
      waitingLive: 'Canlı kur bekleniyor…',
      pushTitle: 'Push bildirimleri',
      pushAria: 'Push bildirimlerine izin ver',
      pushSupported: 'Seviye kırıldığı an sana ulaşabilmemiz için — uygulama kapalıyken bile.',
      pushUnsupported: 'Bu tarayıcı push desteklemiyor; uygulama açıkken yine de haber veririz.',
      pushDenied: 'Bu site için bildirimler engellenmiş. Tarayıcının site ayarlarından izin verip tekrar dene.',
      pushMissingConfig: 'Bu deploy üzerinde push henüz yapılandırılmamış.',
      pushFailed: 'Push şu an açılamadı — birazdan tekrar dene.',
      bannerLabel: 'Eşik geçildi',
      bannerText: (key, value, dir, current) =>
        dir === 'above'
          ? `${key} ${value} seviyesini geçti — şu an ${current}.`
          : `${key} ${value} seviyesini aşağı kırdı — şu an ${current}.`,
      close: 'Kapat',
      errorTitle: 'Sinyal kesildi',
      errorBody: 'Kurlar duraklatıldı — son okuma tutuluyor. Bağlantı gelir gelmez kaldığımız yerden süreceğiz.',
      reconnect: 'Yeniden bağlan',
      today: (diff, dir, value) => `${diff} bugün · ${dir === 'above' ? 'üstü' : 'altı'} ${value}`,
    },
  },
};

/** Cron push bildirim metinleri (sunucu tarafı — Dict'ten bağımsız, hafif). */
export function pushBody(locale: string, key: string, value: string, dir: 'above' | 'below', rate: string): string {
  if (locale === 'tr') {
    return dir === 'above'
      ? `${key} ${value} seviyesini geçti — şu an ${rate}.`
      : `${key} ${value} seviyesinin altına indi — şu an ${rate}.`;
  }
  return dir === 'above'
    ? `${key} crossed ${value} — now ${rate}.`
    : `${key} fell below ${value} — now ${rate}.`;
}
