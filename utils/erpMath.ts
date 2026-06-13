import { Sale } from '../types';

export const getSaleRefundedTotal = (sale: Sale): number =>
  sale.refundedTotal ??
  sale.refunds?.reduce((sum, refund) => sum + refund.total, 0) ??
  0;

export const getSaleRefundedProfit = (sale: Sale): number =>
  sale.refunds?.reduce(
    (sum, refund) =>
      sum +
      refund.items.reduce(
        (itemSum, item) => itemSum + (item.price - item.cost) * item.quantity,
        0
      ),
    0
  ) ?? 0;

export const getSaleNetTotal = (sale: Sale): number => {
  if (sale.status === 'REFUNDED') return 0;
  return Math.max(0, sale.total - getSaleRefundedTotal(sale));
};

export const getSaleNetProfit = (sale: Sale): number => {
  if (sale.status === 'REFUNDED') return 0;
  return sale.profit - getSaleRefundedProfit(sale);
};

export const getRefundedQuantityForProduct = (sale: Sale, productId: string): number =>
  sale.refunds?.reduce(
    (sum, refund) =>
      sum +
      refund.items
        .filter((item) => item.productId === productId)
        .reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  ) ?? 0;
