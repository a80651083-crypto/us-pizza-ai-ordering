/** Formats integer sen as ringgit, e.g. 3290 -> "RM 32.90". */
export function formatRM(sen: number): string {
  const sign = sen < 0 ? "-" : "";
  return `${sign}RM ${(Math.abs(sen) / 100).toFixed(2)}`;
}
