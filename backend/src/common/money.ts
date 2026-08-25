export const MONEY_SCALE = 100;

export function toMinorUnits(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * MONEY_SCALE);
}

export function fromMinorUnits(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 0;
  return amount / MONEY_SCALE;
}
