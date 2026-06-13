const FRACTIONAL_UNITS = ['kq', 'metr', 'litr'];

export const allowsDecimalQuantity = (unit: string): boolean =>
  FRACTIONAL_UNITS.includes(unit.toLowerCase().trim());

export const formatQuantity = (qty: number, unit: string): string => {
  if (allowsDecimalQuantity(unit)) {
    return qty % 1 === 0 ? qty.toString() : qty.toFixed(2);
  }
  return Math.round(qty).toString();
};

export const parseQuantity = (value: string, unit: string): number => {
  const n = allowsDecimalQuantity(unit) ? parseFloat(value) : parseInt(value, 10);
  return isNaN(n) ? 0 : n;
};

export const clampQuantity = (qty: number, maxStock: number, unit: string): number => {
  const min = allowsDecimalQuantity(unit) ? 0.01 : 1;
  return Math.min(maxStock, Math.max(min, qty));
};
