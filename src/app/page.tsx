import Link from 'next/link';
import LandingWater from '@/components/LandingWater';

export default function LandingPage() {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-bg-deep">
      <LandingWater />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(140% 55% at 50% 118%, rgba(5,11,20,0) 30%, rgba(5,11,20,0.85) 100%), linear-gradient(180deg, rgba(5,11,20,0.6) 0%, rgba(5,11,20,0) 30%)',
        }}
      />
      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-3xl flex-col px-6 py-10">
        <header className="flex items-center justify-between">
          <span className="font-heading text-2xl font-semibold text-content-primary">Tresh</span>
          <Link href="/app" className="rounded-xl border border-water/40 bg-water/10 px-4 py-2 text-sm text-water">
            Uygulamayı aç
          </Link>
        </header>

        <div className="flex flex-1 flex-col justify-center py-16">
          <h1 className="max-w-xl font-heading text-4xl font-semibold leading-tight text-content-primary md:text-5xl">
            Sayım tutunca haber ver, grafiğe dadanmak istemiyorum.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-content-secondary">
            Bir parite ve limit seç — örneğin USD/TRY 35.00. Canlı kur çizgini geçtiği an, uygulama
            kapalı olsa bile, telefonuna sade bir bildirim düşer. Ekran başında bekleme; su seviyeyi
            senin yerine izler.
          </p>
          <div className="mt-10">
            <Link
              href="/app"
              className="inline-block rounded-[20px] bg-water px-8 py-4 text-base font-semibold text-[#04121a]"
              style={{ boxShadow: '0 16px 40px -14px rgba(52,227,214,0.6)' }}
            >
              Eşiğini belirle
            </Link>
          </div>
        </div>

        <section className="grid gap-4 pb-8 md:grid-cols-3">
          {[
            ['Canlı seviye', 'Kur, katmanlı bir su yüzeyi olarak akar; eşiğine yaklaştıkça su canlanır.'],
            ['Tek bildirim', 'Çizgi kırıldığında bir kez, sade bir cümleyle haber veririz. Alarm zinciri yok.'],
            ['Kapalıyken bile', 'Web Push sayesinde sekme kapalıyken de seviye izlenir, sana ulaşırız.'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-content-secondary/15 bg-bg-surface/60 p-5 backdrop-blur">
              <h2 className="mb-1.5 font-heading text-base text-content-primary">{t}</h2>
              <p className="text-sm leading-relaxed text-content-secondary">{d}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
