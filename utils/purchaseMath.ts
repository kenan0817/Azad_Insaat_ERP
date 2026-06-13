import { Purchase, PurchasePaymentStatus } from '../types';

export const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export const getPurchaseSubtotal = (purchase: Purchase): number => {
  if (typeof purchase.subtotal === 'number') return purchase.subtotal;
  return roundMoney(purchase.items.reduce((sum, item) => sum + item.quantity * item.cost, 0));
};

export const getPurchaseTotal = (purchase: Purchase): number => {
  if (typeof purchase.totalCost === 'number') return roundMoney(purchase.totalCost);
  const subtotal = getPurchaseSubtotal(purchase);
  return roundMoney(subtotal - (purchase.discount || 0) + (purchase.extraCost || 0) + (purchase.tax || 0));
};

export const getPurchasePaidAmount = (purchase: Purchase): number => {
  if (purchase.payments?.length) {
    return roundMoney(purchase.payments.reduce((sum, payment) => sum + payment.amount, 0));
  }
  if (typeof purchase.paidAmount === 'number') return roundMoney(purchase.paidAmount);
  return purchase.paymentMethod === 'BORC' ? 0 : getPurchaseTotal(purchase);
};

export const getPurchaseRemainingDebt = (purchase: Purchase): number => {
  if (typeof purchase.remainingDebt === 'number') return roundMoney(Math.max(0, purchase.remainingDebt));
  return roundMoney(Math.max(0, getPurchaseTotal(purchase) - getPurchasePaidAmount(purchase)));
};

export const getPurchasePaymentStatus = (purchase: Purchase): PurchasePaymentStatus => {
  const total = getPurchaseTotal(purchase);
  const paid = getPurchasePaidAmount(purchase);
  if (total <= 0 || paid >= total) return 'PAID';
  if (paid <= 0) return 'UNPAID';
  return 'PARTIAL';
};

export const getPurchaseStatusLabel = (purchase: Purchase): string => {
  const status = purchase.paymentStatus || getPurchasePaymentStatus(purchase);
  if (status === 'PAID') return 'Tam ödənilib';
  if (status === 'PARTIAL') return 'Qismən ödənilib';
  return 'Ödənilməyib';
};

export const getPurchasePaymentMethodLabel = (method?: string): string => {
  if (method === 'NAGD') return 'Nağd';
  if (method === 'KART') return 'Kart';
  if (method === 'BANK') return 'Bank';
  if (method === 'BORC') return 'Borc';
  return 'Qeyd yoxdur';
};
