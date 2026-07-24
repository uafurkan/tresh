import { isLocale, type Locale } from '@tresh/shared';
import { notFound } from 'next/navigation';

const CONTENT: Record<Locale, { title: string; updated: string; sections: { h: string; p: string }[] }> = {
  en: {
    title: 'Privacy Policy',
    updated: 'Last updated: 2026',
    sections: [
      {
        h: 'What Tresh stores',
        p: 'Your currency/crypto thresholds are saved on your device (browser local storage or app storage). If you enable notifications, we also store a push subscription identifier (a browser push endpoint or an Expo/mobile push token) together with your thresholds on our server, so we can check rates and notify you — including while the app is closed.',
      },
      {
        h: 'What we don’t do',
        p: 'We don’t collect your name, email, location, or any identity information. We don’t use analytics or advertising trackers. We don’t sell or share your data with third parties.',
      },
      {
        h: 'Rate data',
        p: 'Currency and crypto rates are fetched from public providers (Yahoo Finance, CoinGecko, and similar) to check your thresholds. No personal data is sent to these providers.',
      },
      {
        h: 'Deleting your data',
        p: 'Removing all your thresholds in the app also removes your push subscription from our server. Uninstalling the app or clearing your browser storage removes the local copy.',
      },
      {
        h: 'Contact',
        p: 'Questions about this policy: reach out via the GitHub repository for this project.',
      },
    ],
  },
  tr: {
    title: 'Gizlilik Politikası',
    updated: 'Son güncelleme: 2026',
    sections: [
      {
        h: 'Tresh ne saklar',
        p: 'Döviz/kripto eşiklerin cihazında (tarayıcı local storage\'ı ya da uygulama depolaması) saklanır. Bildirimleri açarsan, sunucumuzda eşiklerinle birlikte bir push abonelik kimliği (tarayıcı push endpoint\'i ya da mobil push token\'ı) da saklarız — böylece uygulama kapalıyken bile kurları kontrol edip haber verebiliriz.',
      },
      {
        h: 'Yapmadıklarımız',
        p: 'Adını, e-postanı, konumunu ya da herhangi bir kimlik bilgini toplamıyoruz. Analitik ya da reklam takip aracı kullanmıyoruz. Verini üçüncü taraflarla satmıyoruz veya paylaşmıyoruz.',
      },
      {
        h: 'Kur verisi',
        p: 'Döviz ve kripto kurları, eşiklerini kontrol etmek için genel kur sağlayıcılarından (Yahoo Finance, CoinGecko ve benzerleri) çekilir. Bu sağlayıcılara hiçbir kişisel veri gönderilmez.',
      },
      {
        h: 'Verini silmek',
        p: 'Uygulamadaki tüm eşiklerini kaldırdığında, push aboneliğin de sunucumuzdan silinir. Uygulamayı kaldırmak ya da tarayıcı depolamanı temizlemek yerel kopyayı da siler.',
      },
      {
        h: 'İletişim',
        p: 'Bu politikayla ilgili sorular için: bu projenin GitHub reposu üzerinden ulaşabilirsin.',
      },
    ],
  },
};

export default function PrivacyPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const c = CONTENT[params.locale];
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '64px 20px', color: '#E8F1F5' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{c.title}</h1>
      <p style={{ fontSize: 13, color: '#8FA5B3', marginBottom: 32 }}>{c.updated}</p>
      {c.sections.map((s) => (
        <section key={s.h} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{s.h}</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: '#8FA5B3' }}>{s.p}</p>
        </section>
      ))}
    </main>
  );
}
