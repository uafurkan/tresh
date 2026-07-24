/** Kur, eşiğe ne kadar yakın (0 = uzak, 1 = tam üzerinde) — renk/durum hesaplarında kullanılır. */
export function tensionOf(rate: number, value: number, span: number): number {
  return Math.max(0, Math.min(1, 1 - Math.abs(rate - value) / (span * 0.5)));
}
