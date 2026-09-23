export type Unit = 'kg' | 'piece' | 'pcs' | 'sack' | 'crate' | 'litre' | 'bundle';
export type ProductUnit = Unit;
export type ProductCategory = 'Vegetable' | 'Spice' | 'Fruit' | 'Root' | 'Leafy';
export type ProductStatus = 'Active' | 'Inactive';
export type EntityStatus = ProductStatus;
export type StockCondition = 'FRESH' | 'AGING' | 'DAMAGED' | 'CUSTOM';

export interface Category {
  id: string;
  name: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryInput {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface CategoryStats {
  categoryName: string;
  totalKg: number;
  totalPcs: number;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  category?: Category;
  unit: Unit;
  basePrice: number;
  listPrice: number;
  tradePrice: number;
  mrp: number;
  listTaxPercent?: number | null;
  listProfitPercent?: number | null;
  listOthersPercent?: number | null;
  tradeTaxPercent?: number | null;
  tradeProfitPercent?: number | null;
  tradeOthersPercent?: number | null;
  mrpTaxPercent?: number | null;
  mrpProfitPercent?: number | null;
  mrpOthersPercent?: number | null;
  stock: number;
  status: ProductStatus;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface ProductHistoryAuditEntry {
  id: string;
  action: string;
  actor?: string | null;
  createdAt: string;
  changes?: unknown;
}

export interface ProductHistoryResponse {
  stockEntries: StockEntry[];
  stockAdjustments: StockAdjustment[];
  distributionLines: DistributionLine[];
  saleItems: InvoiceLineItem[];
  audit: ProductHistoryAuditEntry[];
}

export interface ProductInUseCounts {
  stockEntries?: number;
  distributionLines?: number;
  saleItems?: number;
  stockAdjustments?: number;
}

export interface Van {
  id: string;
  vanName: string;
  driver: string;
  isActive?: boolean;
  todaySummary?: { allocated: number; sold: number; revenue: number };
  createdAt?: string;
  updatedAt?: string;
}

export interface VanInput {
  id?: string;
  vanName: string;
  driver: string;
  isActive?: boolean;
}

export type CustomerType = 'RESTAURANT' | 'SHOP' | 'DIRECT' | 'OTHER';

export interface Customer {
  id: string;
  name: string;
  type: CustomerType;
  phone?: string | null;
  address?: string | null;
  status: EntityStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerInput {
  name: string;
  type: CustomerType;
  phone?: string;
  address?: string;
  status?: EntityStatus;
}

export interface StockEntry {
  id: string;
  date: string;
  productId: string;
  batchId?: string | null;
  quantity: number;
  remainingQuantity?: number;
  expiryDate?: string | null;
  basePrice: number;
  listPrice?: number | null;
  tradePrice?: number | null;
  mrp?: number | null;
  listTaxPercent?: number | null;
  listProfitPercent?: number | null;
  listOthersPercent?: number | null;
  tradeTaxPercent?: number | null;
  tradeProfitPercent?: number | null;
  tradeOthersPercent?: number | null;
  mrpTaxPercent?: number | null;
  mrpProfitPercent?: number | null;
  mrpOthersPercent?: number | null;
  condition?: StockCondition;
  source: string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  product?: { name: string; unit: string };
}

export interface StockBatch {
  id: string;
  date: string;
  source: string;
  notes?: string | null;
  entries: StockEntry[];
  createdAt?: string;
  updatedAt?: string;
}

export interface StockEntryInput {
  date: string;
  productId: string;
  quantity: number;
  basePrice: number;
  listTaxPercent?: number;
  listProfitPercent?: number;
  listOthersPercent?: number;
  listPrice?: number;
  tradeTaxPercent?: number;
  tradeProfitPercent?: number;
  tradeOthersPercent?: number;
  tradePrice?: number;
  mrpTaxPercent?: number;
  mrpProfitPercent?: number;
  mrpOthersPercent?: number;
  mrp?: number;
  source: string;
  expiryDate?: string;
  notes?: string;
}

export type StockAllocationConsumerType = 'DISTRIBUTION_LINE' | 'SALE_ITEM' | 'STOCK_ADJUSTMENT';

export interface StockLotAllocation {
  id: string;
  consumerType: StockAllocationConsumerType;
  consumerId: string;
  quantity: number;
  remainingQuantity: number;
  unitCost: number;
  createdAt?: string;
}

export interface StockEntryDetail extends StockEntry {
  allocations: StockLotAllocation[];
}

export type StockAdjustmentReason = 'DAMAGE' | 'WASTAGE' | 'CORRECTION';
export type StockLocation = 'WAREHOUSE' | 'VAN';

export interface StockAdjustment {
  id: string;
  date: string;
  productId: string;
  quantity: number;
  reason: StockAdjustmentReason;
  location: StockLocation;
  vanId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  product?: { name: string; unit: string };
  van?: { vanName: string } | null;
}

export interface StockAdjustmentInput {
  date: string;
  productId: string;
  stockEntryId?: string;
  quantity: number;
  reason: StockAdjustmentReason;
  location: StockLocation;
  vanId?: string;
  notes?: string;
}

export interface StockAdjustmentLot {
  quantity: number;
  unitCost: number;
  stockEntry: { id: string; source: string; basePrice: number };
}

export interface StockAdjustmentDetail extends StockAdjustment {
  lots: StockAdjustmentLot[];
}

export interface StockAdjustmentAuditEntry {
  id: string;
  occurredAt: string;
  action: string;
  userId?: string | null;
  before?: unknown;
  after?: unknown;
  meta?: unknown;
}

export interface StockAdjustmentTransactionEntry {
  id: string;
  occurredAt: string;
  amount: number;
  type: string;
  description: string;
  refTable: string;
  refId: string;
}

export interface StockAdjustmentHistoryAllocation {
  id: string;
  stockEntryId: string;
  quantity: number;
  unitCost: number;
  createdAt: string;
  stockEntry: {
    id: string;
    date: string;
    source: string;
    expiryDate: string | null;
    basePrice: number;
  };
}

export interface StockAdjustmentHistoryResponse {
  adjustment: StockAdjustment;
  audit: StockAdjustmentAuditEntry[];
  transactions: StockAdjustmentTransactionEntry[];
  allocations: StockAdjustmentHistoryAllocation[];
}

export interface StockAdjustmentAuditListResponse {
  data: StockAdjustmentAuditEntry[];
  page: number;
  pageSize: number;
  total: number;
}

export interface DistributionLine {
  id: string;
  productId: string;
  batchId?: string | null;
  allocated: number;
  returned: number;
  damageReturned?: number;
  product?: { name: string; unit: Unit };
}

export interface Distribution {
  id: string | null;
  vanId: string;
  date: string;
  lines: DistributionLine[];
}

export interface DistributionListItem {
  id: string;
  vanId: string;
  date: string;
  createdAt: string;
  van?: { vanName: string };
  lines: DistributionLine[];
}

export interface DistributionDetail extends DistributionListItem {
  van: Van;
}

export type DistributionOrderStatus = 'issued' | 'confirmed' | 'cancelled';

export interface DistributionOrderLine {
  id: string;
  productId: string;
  requestedQty: number;
  confirmedQty: number | null;
  price: number | null;
  product?: { name: string; unit: Unit };
}

export interface DistributionOrderListItem {
  id: string;
  customerId: string;
  date: string;
  status: DistributionOrderStatus;
  confirmedAt: string | null;
  saleId: string | null;
  createdAt: string;
  customer?: { name: string; type: CustomerType };
  lines: DistributionOrderLine[];
}

export interface DistributionOrderDetail extends DistributionOrderListItem {
  customer: Customer;
}

export interface VanStockSummaryProduct {
  productId: string;
  name: string | null;
  unit: Unit | null;
  allocated: number;
  returned: number;
  sold: number;
  damaged: number;
  available: number;
  soldRevenue: number;
  soldCost: number;
  profit: number;
  profitMargin: number;
  unitPrice: number | null;
  isDamagedStock: boolean;
}

export interface VanStockSummary {
  vanId: string;
  date: string;
  van: { vanName: string; driver: string };
  distributionId: string | null;
  products: VanStockSummaryProduct[];
  reconciliation: {
    isBalanced: boolean;
    discrepancies: Array<{
      productId: string;
      name: string | null;
      available: number;
      reason: string;
    }>;
  };
}

export type VanActivityEventType =
  | 'ALLOCATION'
  | 'SALE'
  | 'RETURN'
  | 'DAMAGE'
  | 'WASTAGE'
  | 'CORRECTION';

export interface VanActivityEvent {
  id: string;
  occurredAt: string;
  type: VanActivityEventType;
  productId: string;
  productName: string | null;
  productUnit: string | null;
  quantity: number;
  notes: string | null;
  saleId?: string;
  invoiceId?: string | null;
  adjustmentId?: string;
  distributionLineId?: string;
  price?: number;
}

export interface VanActivityResponse {
  vanId: string;
  date: string;
  van: { vanName: string; driver: string };
  distributionId: string | null;
  events: VanActivityEvent[];
}

export type InvoiceStatus = 'paid' | 'unpaid';

export interface InvoiceListItem {
  id: string;
  date: string;
  van: string | null;
  vanId: string | null;
  customer: string | null;
  customerId: string | null;
  items: number;
  total: number;
  status: InvoiceStatus;
}

export interface InvoiceLineItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  qty: number;
  subtotal: number;
}

export interface InvoiceDetail {
  id: string;
  date: string;
  vanId: string | null;
  van: Van | null;
  customerId: string | null;
  customer: Customer | null;
  total: number;
  status: InvoiceStatus;
  paidAt?: string;
  items: InvoiceLineItem[];
}

export interface SaleItem {
  id: string;
  productId: string;
  price: number;
  qty: number;
  product?: { name: string; unit: Unit };
}

export type SaleType = 'VAN' | 'DISTRIBUTION_CONFIRMATION' | 'DIRECT_CUSTOMER';

export interface SaleListItem {
  id: string;
  vanId: string | null;
  customerId?: string | null;
  type?: SaleType;
  date: string;
  total: number;
  invoiceId: string | null;
  createdAt: string;
  van?: { vanName: string } | null;
  customer?: { name: string } | null;
  items: SaleItem[];
  invoice?: { id: string; status: InvoiceStatus; total: number } | null;
}

export interface SaleDetail extends SaleListItem {
  van: Van | null;
  invoice: InvoiceDetail | null;
}

export interface AdjustmentByLotRow {
  stockEntryId: string;
  productId: string;
  totalQuantity: number;
  reasons: Partial<Record<StockAdjustmentReason, number>>;
  stockEntry?: { id: string; source: string; date: string };
}

export interface ReportRow {
  [key: string]: string | number | null | undefined;
}

export interface ReportResponse {
  type: string;
  rows: ReportRow[];
  total?: number;
  meta?: Record<string, unknown>;
}

export type ExpenseCategory =
  | 'Hosting'
  | 'Domain'
  | 'Software / SaaS'
  | 'Employee Salary'
  | 'Commission'
  | 'Office Rent'
  | 'Utilities'
  | 'Internet / Phone'
  | 'Fuel'
  | 'Van Rent'
  | 'Labor Cost'
  | 'Shipping Cost'
  | 'Market Fees'
  | 'Repairs & Maintenance'
  | 'Packaging'
  | 'Bank Charges'
  | 'Other';
export type ExpenseStatus = 'paid' | 'pending';
export type ExpensePaymentMethod = 'cash' | 'bank' | 'mobile_banking' | 'card' | 'other';

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  status: ExpenseStatus;
  vendor?: string | null;
  paymentMethod?: ExpensePaymentMethod | string | null;
  bankAccountId?: string | null;
  bankAccount?: { bankName: string; accountNumber?: string | null } | null;
  notes?: string | null;
  createdBy?: { id: string; name: string; email?: string | null } | string | null;
  vanId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardMetrics {
  todayRevenue: number;
  todayExpenses: number;
  todayProfit: number;
  todayInvoices: number;
  stockOnHand: number;
  lowStockCount: number;
}

export type Timeframe = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface SeriesPoint {
  label: string;
  revenue: number;
  cost: number;
  profit: number;
  stock: number;
}

export interface VanPerformance {
  van: string;
  revenue: number;
  efficiency: number;
  returned: number;
}

export interface CategorySlice {
  name: string;
  value: number;
}

export interface LowStockItem {
  productId: string;
  name: string;
  stock: number;
  unit: Unit;
  category: ProductCategory;
}

export interface ActivityItem {
  id: string;
  date: string;
  amount: number;
  type: 'sale' | 'expense' | 'stock';
  description: string;
}

export interface LedgerSummary {
  month: string;
  revenue: number;
  cost: number;
  expenses: number;
  grossProfit: number;
  netProfit: number;
  stockUnits: number;
}

export interface VanProfitabilityRow {
  vanId: string;
  vanName: string;
  revenue: number;
  cogs: number;
  expenses: number;
  netProfit: number;
}

export interface BatchProductBreakdown {
  productId: string;
  productName: string;
  receivedQty: number;
  cost: number;
  soldQty: number;
  soldRevenue: number;
  realizedCogs: number;
  remainingQty: number;
  potentialRevenue: number;
}

export interface BatchProfitSummary {
  batchId: string;
  date: string;
  source: string;
  totalReceivedQty: number;
  totalCost: number;
  soldQty: number;
  soldRevenue: number;
  realizedCogs: number;
  realizedProfit: number;
  remainingQty: number;
  warehouseWriteOffQty: number;
  warehouseWriteOffCost: number;
  vanLossQty: number;
  vanLossCost: number;
  totalLossCost: number;
  potentialRevenueIfSold: number;
  potentialCostOfRemaining: number;
  potentialProfitIfSold: number;
  projectedProfitIfAllSold: number;
  products: BatchProductBreakdown[];
}

export interface BatchVanProfitabilityTotals {
  totalSell: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
  assignedQty: number;
  assignedCost: number;
  soldQty: number;
  lossQty: number;
  lossCost: number;
  batchCount: number;
}

export interface BatchVanProfitabilityRow {
  batchId: string;
  date: string;
  source: string;
  vanId: string;
  vanName: string;
  assignedQty: number;
  assignedCost: number;
  soldQty: number;
  soldRevenue: number;
  soldCogs: number;
  grossProfit: number;
  profitMargin: number;
  lossQty: number;
  lossCost: number;
  remainingQty: number;
}

export interface BatchVanProfitabilityResponse {
  data: BatchVanProfitabilityRow[];
  page: number;
  pageSize: number;
  total: number;
  totals: BatchVanProfitabilityTotals;
}

export type SearchKind = 'all' | 'sales' | 'stock' | 'expenses' | 'returns';
export type SearchStatus = 'completed' | 'stored' | 'processed' | 'pending';

export interface SearchRow {
  id: string;
  type: 'sales' | 'stock' | 'expenses' | 'returns';
  title: string;
  amount: number;
  date: string;
  van: string;
  status: SearchStatus;
  category: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  isActive?: boolean;
  createdAt?: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}
