export function formatCompactNumber(value: number | string, maxFractionDigits = 1): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return String(value ?? '');

  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';

  const format = (val: number, suffix: string) => {
    const s = val.toFixed(maxFractionDigits).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
    return `${sign}${s}${suffix}`;
  };

  if (abs >= 1_000_000_000) return format(abs / 1_000_000_000, 'B');
  if (abs >= 1_000_000) return format(abs / 1_000_000, 'M');
  if (abs >= 1_000) return format(abs / 1_000, 'K');

  if (Number.isInteger(n)) return `${n}`;
  return n.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

export function formatValueWithAffixes(
  value: number | string,
  prefix = '',
  suffix = '',
  maxFractionDigits = 1,
): string {
  return `${prefix}${formatCompactNumber(value, maxFractionDigits)}${suffix}`;
}
