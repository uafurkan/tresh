'use client';

import { useMemo, useState } from 'react';
import { useRates } from '@/lib/client/useRates';
import { CONVERTER_CURRENCIES, CONVERTER_PAIRS } from '@/lib/pairs';
import { dictionaries, type Locale } from '@/lib/i18n';

const ALL_CODES = ['USD', ...CONVERTER_CURRENCIES.map((c) => c.code)];

// iOS'un Hesap Makinesi/Dönüştürücü'sünde olduğu gibi: gruplu binlik ayracı +
// sabit ondalık basamak sayısı. "maximumSignificantDigits" büyük sayılarda
// ondalığı tamamen kırpıp "117,944" gibi anlaşılmaz sonuçlar veriyordu;
// onun yerine büyüklüğe göre sabit basamak sayısı kullanıyoruz. Yerel de
// (tr-TR / en-US) doğru binlik/ondalık ayracını otomatik seçiyor.
function fmt(n: number, locale: Locale): string {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const decimals = abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
  const intlLocale = locale === 'tr' ? 'tr-TR' : 'en-US';
  return new Intl.NumberFormat(intlLocale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}

/** Ana sayfada canlı döviz çevirici + BTC dahil "USD karşılığı" kur tablosu. */
export default function CurrencyConverter({ locale }: { locale: Locale }) {
  const d = dictionaries[locale].landing;
  const { rates } = useRates(CONVERTER_PAIRS);
  const [amount, setAmount] = useState('1');
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('TRY');

  const usdValueOf = useMemo(() => {
    const map: Record<string, number | undefined> = { USD: 1 };
    for (const c of CONVERTER_CURRENCIES) {
      const r = rates[c.pair]?.rate;
      if (r == null) continue;
      map[c.code] = c.invert ? 1 / r : r;
    }
    return map;
  }, [rates]);

  const amountNum = parseFloat(amount.replace(',', '.'));
  const fromUsd = usdValueOf[from];
  const toUsd = usdValueOf[to];
  const converted = Number.isFinite(amountNum) && fromUsd != null && toUsd != null ? (amountNum * fromUsd) / toUsd : null;

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const selectStyle = {
    background: 'rgba(11,22,34,0.7)',
    borderColor: 'rgba(143,165,179,0.2)',
    color: '#E8F1F5',
  };

  return (
    <div className="mb-10">
      <div
        className="rounded-3xl border p-5 backdrop-blur md:p-6"
        style={{ borderColor: 'rgba(143,165,179,0.15)', background: 'rgba(11,22,34,0.5)' }}
      >
        <div className="mb-4 text-[11px] uppercase tracking-[1.5px] text-content-secondary">{d.converterTitle}</div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border px-3.5 py-3" style={selectStyle}>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="num min-w-0 flex-1 border-0 bg-transparent text-lg text-content-primary outline-none"
              aria-label="Amount"
            />
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="num rounded-lg border-0 bg-transparent text-sm text-water outline-none"
              style={{ appearance: 'none' }}
              aria-label="From currency"
            >
              {ALL_CODES.map((c) => (
                <option key={c} value={c} style={{ background: '#0B1622' }}>{c}</option>
              ))}
            </select>
          </div>

          <button
            onClick={swap}
            aria-label={d.converterSwap}
            title={d.converterSwap}
            className="mx-auto flex h-9 w-9 flex-none items-center justify-center rounded-full border text-content-secondary transition-transform hover:rotate-180 hover:text-water sm:mx-0"
            style={{ borderColor: 'rgba(143,165,179,0.2)', background: 'rgba(11,22,34,0.7)' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M7 10h13l-4-4M17 14H4l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="flex flex-1 items-center gap-2 rounded-2xl border px-3.5 py-3" style={selectStyle}>
            <div className="num min-w-0 flex-1 truncate text-lg text-content-primary">
              {converted != null ? fmt(converted, locale) : '···'}
            </div>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="num rounded-lg border-0 bg-transparent text-sm text-water outline-none"
              style={{ appearance: 'none' }}
              aria-label="To currency"
            >
              {ALL_CODES.map((c) => (
                <option key={c} value={c} style={{ background: '#0B1622' }}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 border-t pt-4" style={{ borderColor: 'rgba(143,165,179,0.12)' }}>
          <div className="mb-2.5 text-[11px] uppercase tracking-[1.5px] text-content-secondary">{d.boardTitle}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            {CONVERTER_CURRENCIES.map((c) => {
              const v = usdValueOf[c.code];
              return (
                <div key={c.code} className="flex items-center justify-between gap-2 text-sm">
                  <span className="num text-content-secondary">{c.code}</span>
                  <span className="num text-content-primary">{v != null ? `$${fmt(v, locale)}` : '···'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
