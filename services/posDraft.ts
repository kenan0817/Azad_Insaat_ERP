import { CartItem } from '../types';

const DRAFT_KEY = 'insaat-erp-pos-draft';

export interface POSDraft {
  cart: CartItem[];
  selectedCustomerId: string;
  paymentMethod: 'NAGD' | 'KART' | 'BORC';
  discount: string;
  discountType: 'amount' | 'percent';
  saleNote: string;
}

export const savePOSDraft = (draft: POSDraft): void => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
};

export const loadPOSDraft = (): POSDraft | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as POSDraft;
  } catch {
    return null;
  }
};

export const clearPOSDraft = (): void => {
  localStorage.removeItem(DRAFT_KEY);
};
