export { tensionOf } from '@tresh/shared';

export function miniWavePath(level: number, w: number, h: number): string {
  const midY = h * (1 - level) * 0.7 + h * 0.15;
  const parts: string[] = [];
  for (let x = 0; x <= w; x += 4) parts.push(`${x === 0 ? 'M' : 'L'}${x} ${(midY + Math.sin(x * 0.28) * 2.2).toFixed(1)}`);
  return parts.join(' ');
}
