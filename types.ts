export const DEFAULT_CATEGORIES = [
  'Sement və Qarışıqlar',
  'Kərpic və Blok',
  'Boya və Lak',
  'Alətlər',
  'Santexnika',
  'Elektrik',
  'Digər'
];

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number; // Maya dəyəri
  stock: number;
  unit: string; // ədəd, kq, metr, və s.
  imageUrl?: string;
  sku?: string; // Daxili məhsul kodu
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  debt: number;
}

export interface PurchaseItem {
  productId: string;
  name: string;
  quantity: number;
  cost: number;
}

export interface Purchase {
  id: string;
  supplierId?: string;
  date: string;
  invoiceNo?: string;
  supplierInvoiceNo?: string;
  note?: string;
  items: PurchaseItem[];
  totalCost: number;
  paymentMethod: 'NAGD' | 'KART' | 'BORC';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  debt: number; // Borc/Qalıq
}

export interface CartItem extends Product {
  quantity: number;
}

export interface SaleRefundItem {
  productId: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  cost: number;
}

export interface SaleRefund {
  id: string;
  date: string;
  items: SaleRefundItem[];
  total: number;
  reason?: string;
  cashierName?: string;
}

export interface Sale {
  id: string;
  date: string; // ISO string
  items: CartItem[];
  total: number;
  profit: number;
  discount?: number;
  customerId?: string;
  paymentMethod?: 'NAGD' | 'KART' | 'BORC';
  status?: 'COMPLETED' | 'PARTIALLY_REFUNDED' | 'REFUNDED';
  refunds?: SaleRefund[];
  refundedTotal?: number;
  note?: string;
  cashierName?: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalProfit: number;
  totalExpenses: number;
  lowStockCount: number;
  totalSalesCount: number;
}

export enum AuditAction {
  ADD = 'ADD',
  DELETE = 'DELETE',
  UPDATE = 'UPDATE',
  SALE = 'SALE',
  BULK_IMPORT = 'BULK_IMPORT',
  REFUND = 'REFUND'
}

export type UserRole = 'MUDIR' | 'EMEKDAS';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  name: string;
  mustChangePassword?: boolean;
}

export interface AppSettings {
  lowStockThreshold: number;
  aiEnabled: boolean;
  storeName: string;
  storePhone: string;
  storeAddress: string;
  largeSaleThreshold: number;
}

export interface AuditLogEntry {
  id: string;
  date: string;
  action: AuditAction;
  details: string;
  userId?: string;
  userName?: string;
}

export type DebtEntityType = 'CUSTOMER' | 'SUPPLIER';
export type DebtEntryType = 'SALE' | 'PURCHASE' | 'PAYMENT' | 'REFUND' | 'ADJUSTMENT';
export type DebtDirection = 'INCREASE' | 'DECREASE';

export interface DebtLedgerEntry {
  id: string;
  date: string;
  entityType: DebtEntityType;
  entityId: string;
  type: DebtEntryType;
  direction: DebtDirection;
  amount: number;
  balanceAfter: number;
  note?: string;
  refId?: string;
  userName?: string;
}

export type InventoryMovementType = 'SALE' | 'PURCHASE' | 'REFUND' | 'ADJUSTMENT' | 'LOSS';

export interface InventoryMovement {
  id: string;
  date: string;
  productId: string;
  productName: string;
  type: InventoryMovementType;
  quantityChange: number;
  stockAfter: number;
  unit: string;
  note?: string;
  refId?: string;
  userName?: string;
}
