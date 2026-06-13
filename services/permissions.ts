import { UserRole } from '../types';

export type TabKey =
  | 'dashboard'
  | 'inventory'
  | 'pos'
  | 'customers'
  | 'expenses'
  | 'sales'
  | 'purchases'
  | 'purchaseHistory'
  | 'suppliers'
  | 'assistant'
  | 'audit'
  | 'settings';

const MUDIR_TABS: TabKey[] = [
  'dashboard', 'pos', 'sales', 'inventory', 'customers', 'expenses',
  'purchases', 'purchaseHistory', 'suppliers', 'assistant', 'audit', 'settings',
];

const EMEKDAS_TABS: TabKey[] = ['pos', 'customers', 'inventory', 'sales'];

export const getAllowedTabs = (role: UserRole): TabKey[] =>
  role === 'MUDIR' ? MUDIR_TABS : EMEKDAS_TABS;

export const canAccessTab = (role: UserRole, tab: TabKey): boolean =>
  getAllowedTabs(role).includes(tab);

export const canDeleteProduct = (role: UserRole): boolean => role === 'MUDIR';
export const canEditProduct = (role: UserRole): boolean => role === 'MUDIR';
export const canAddProduct = (role: UserRole): boolean => role === 'MUDIR';
export const canRefundSale = (role: UserRole): boolean => role === 'MUDIR';
export const canDeleteCustomer = (role: UserRole): boolean => role === 'MUDIR';
export const canManageUsers = (role: UserRole): boolean => role === 'MUDIR';
export const canManageExpenses = (role: UserRole): boolean => role === 'MUDIR';
export const canManagePurchases = (role: UserRole): boolean => role === 'MUDIR';
export const canViewAudit = (role: UserRole): boolean => role === 'MUDIR';
export const canManageSettings = (role: UserRole): boolean => role === 'MUDIR';
