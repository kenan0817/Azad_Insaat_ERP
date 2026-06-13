import { Product, Sale } from '../types';
import { getRefundedQuantityForProduct, getSaleNetTotal } from './erpMath';

export const getFrequentProductIds = (sales: Sale[], limit = 10): string[] => {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const counts: Record<string, number> = {};

  sales
    .filter((s) => s.status !== 'REFUNDED' && new Date(s.date).getTime() >= thirtyDaysAgo)
    .forEach((sale) => {
      sale.items.forEach((item) => {
        const netQuantity = item.quantity - getRefundedQuantityForProduct(sale, item.id);
        if (netQuantity > 0) {
          counts[item.id] = (counts[item.id] || 0) + netQuantity;
        }
      });
    });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
};

export const getFrequentProducts = (products: Product[], sales: Sale[], limit = 10): Product[] => {
  const ids = getFrequentProductIds(sales, limit);
  return ids
    .map((id) => products.find((p) => p.id === id && p.stock > 0))
    .filter((p): p is Product => !!p);
};

export const getTodaySalesSummary = (sales: Sale[]): { count: number; revenue: number } => {
  const today = new Date().toISOString().split('T')[0];
  const todays = sales.filter((s) => s.status !== 'REFUNDED' && s.date.startsWith(today));
  return {
    count: todays.length,
    revenue: todays.reduce((sum, s) => sum + getSaleNetTotal(s), 0),
  };
};
