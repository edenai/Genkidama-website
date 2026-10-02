/**
 * Small, dependency-free helpers shared by the experiment charts. Charts are
 * server-rendered SVG: crisp at any pixel ratio, responsive through viewBox,
 * and readable without JavaScript.
 */
import { armSeriesVar, type ArmId } from '@data/experiments';

/** Fill colour of an arm, as a CSS variable reference (tokens.css). */
export const armFill = (arm: ArmId) => `var(${armSeriesVar[arm]})`;
/** Brighter text/ink colour per arm, kept inside the two established hue families. */
export const armInk: Record<ArmId, string> = {
  deepseek_mcp: 'var(--energy-300)',
  gemini_native: 'var(--ember)',
};

export type Scale = (v: number) => number;

export function linear(domainMin: number, domainMax: number, rangeMin: number, rangeMax: number): Scale {
  const d = domainMax - domainMin || 1;
  return (v) => rangeMin + ((v - domainMin) / d) * (rangeMax - rangeMin);
}

export function log10(domainMin: number, domainMax: number, rangeMin: number, rangeMax: number): Scale {
  const lo = Math.log10(domainMin), hi = Math.log10(domainMax);
  const d = hi - lo || 1;
  return (v) => rangeMin + ((Math.log10(Math.max(v, domainMin)) - lo) / d) * (rangeMax - rangeMin);
}

/** 1-2-5 ticks covering [min, max] on a log axis. */
export function logTicks(min: number, max: number): number[] {
  const out: number[] = [];
  let e = Math.floor(Math.log10(min));
  while (10 ** e <= max * 1.0001) {
    for (const m of [1, 2, 5]) {
      const v = m * 10 ** e;
      if (v >= min * 0.999 && v <= max * 1.001) out.push(v);
    }
    e++;
  }
  return out;
}

/** Deterministic jitter in [-1, 1] from an index (no randomness between builds). */
export const jitter = (i: number) => ((i * 0.618033988749895) % 1) * 2 - 1;

/** Compact second label for axes: 5, 20, 100, 1k. */
export const sLabel = (v: number) => (v >= 1000 ? `${v / 1000}k` : String(v));
