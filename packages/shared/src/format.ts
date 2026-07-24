import type { Locale } from './i18n';

/** Sabit ondalık basamak + yerel binlik ayracı (tr-TR: nokta/virgül, en-US: virgül/nokta). */
export function fmtNum(value: number, decimals: number, locale: Locale): string {
  if (!Number.isFinite(value)) return '—';
  const intlLocale = locale === 'tr' ? 'tr-TR' : 'en-US';
  return new Intl.NumberFormat(intlLocale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

/**
 * Kullanıcı hem binlik hem ondalık ayracı birlikte yazarsa (ör. Türkçe
 * biçimde "3.109.200,50") basit bir replace(',', '.') bunu yanlış
 * ayrıştırırdı. Hangi ayracın metinde en son geçtiğine bakıp o ondalık,
 * diğeri binlik ayracı kabul edilir.
 */
export function parseLocaleNumber(input: string): number {
  let s = input.trim();
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (lastComma !== -1) {
    s = s.replace(',', '.');
  } else if (lastDot !== -1 && (s.match(/\./g) || []).length > 1) {
    // Birden fazla nokta varsa hepsi binlik ayracıdır (ör. "3.109.200").
    s = s.replace(/\./g, '');
  }
  return parseFloat(s);
}
