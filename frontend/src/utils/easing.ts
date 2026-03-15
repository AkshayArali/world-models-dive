export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function smoothClamp(t: number, start: number, end: number): number {
  return Math.max(0, Math.min((t - start) / (end - start), 1));
}
