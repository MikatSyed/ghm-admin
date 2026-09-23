'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api, type Paginated } from '@/lib/api';
import type {
  Product, Unit, ProductStatus, ProductHistoryResponse,
  Category, CategoryInput, CategoryStats,
  Customer, CustomerInput, CustomerType,
  Van, VanInput, StockEntry, StockEntryInput, StockEntryDetail, StockBatch, Distribution,
  DistributionListItem, DistributionDetail,
  DistributionOrderListItem, DistributionOrderDetail, DistributionOrderStatus,
  StockAdjustment, StockAdjustmentInput, StockAdjustmentDetail, StockAdjustmentReason, StockLocation,
  StockAdjustmentHistoryResponse,
  StockAdjustmentAuditListResponse,
  AdjustmentByLotRow,
  VanStockSummary, VanActivityResponse,
  SaleListItem, SaleDetail,
  InvoiceListItem, InvoiceDetail, InvoiceStatus,
  Expense, ExpenseCategory, ExpenseStatus,
  DashboardMetrics, SeriesPoint, VanPerformance, CategorySlice, LowStockItem, ActivityItem, Timeframe,
  LedgerSummary, VanProfitabilityRow, BatchProfitSummary, BatchVanProfitabilityResponse,
  SearchRow, SearchKind, SearchStatus,
  ReportResponse,
  AuthUser, LoginResponse,
  StockCondition,
} from '@/lib/types';

export const qk = {
  auth: ['auth', 'me'] as const,
  products: (params?: ProductListParams) => ['products', params ?? {}] as const,
  productHistory: (id: string) => ['products', id, 'history'] as const,
  stockEntries: (params?: StockEntryListParams) => ['stock-entries', params ?? {}] as const,
  stockBatches: (params?: StockBatchListParams) => ['stock-batches', params ?? {}] as const,
  vans: ['vans'] as const,
  van: (id: string) => ['vans', id] as const,
  vanDistribution: (id: string, date?: string) => ['vans', id, 'distribution', date ?? 'today'] as const,
  vanStockSummary: (id: string, date?: string) => ['vans', id, 'stock-summary', date ?? 'today'] as const,
  vanActivity: (id: string, date?: string) => ['vans', id, 'activity', date ?? 'today'] as const,
  invoices: (params?: InvoiceListParams) => ['invoices', params ?? {}] as const,
  invoice: (id: string) => ['invoices', id] as const,
  sales: (params?: SaleListParams) => ['sales', params ?? {}] as const,
  sale: (id: string) => ['sales', id] as const,
  distributions: (params?: DistributionListParams) => ['distributions', params ?? {}] as const,
  distribution: (id: string) => ['distributions', id] as const,
  customers: (params?: CustomerListParams) => ['customers', params ?? {}] as const,
  customer: (id: string) => ['customers', id] as const,
  distributionOrders: (params?: DistributionOrderListParams) => ['distribution-orders', params ?? {}] as const,
  distributionOrder: (id: string) => ['distribution-orders', id] as const,
  adjustmentsByLot: (params?: AdjustmentsByLotParams) => ['stock-adjustments', 'by-lot', params ?? {}] as const,
  report: (type: string, params?: ReportParams) => ['reports', type, params ?? {}] as const,
  expenses: (params?: ExpenseListParams) => ['expenses', params ?? {}] as const,
  dashboardMetrics: ['dashboard', 'metrics'] as const,
  dashboardSeries: (tf: Timeframe) => ['dashboard', 'series', tf] as const,
  dashboardVans: ['dashboard', 'vans-performance'] as const,
  dashboardCategories: ['dashboard', 'categories'] as const,
  dashboardLowStock: (threshold?: number) => ['dashboard', 'low-stock', threshold ?? null] as const,
  dashboardActivity: (limit?: number) => ['dashboard', 'activity', limit ?? 10] as const,
  ledger: (month?: string) => ['accounting', 'ledger', month ?? 'current'] as const,
  vanProfitability: (month?: string) => ['accounting', 'van-profitability', month ?? 'current'] as const,
  batches: (params?: BatchProfitabilityParams) => ['accounting', 'batches', params ?? {}] as const,
  batchVanProfitability: (params?: BatchVanProfitabilityParams) => ['accounting', 'batch-van-profitability', params ?? {}] as const,
  batch: (id: string) => ['accounting', 'batches', 'detail', id] as const,
  search: (params: SearchParams) => ['search', params] as const,
};

/* ── Auth ─────────────────────────────────────────────────── */

export function useLogin() {
  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      api.post<LoginResponse>('/auth/login', body),
  });
}

export function useMe(enabled = true) {
  return useQuery({
    queryKey: qk.auth,
    queryFn: () => api.get<AuthUser>('/auth/me'),
    enabled,
    retry: false,
  });
}

/* ── Products ─────────────────────────────────────────────── */

export type ProductListParams = {
  page?: number;
  pageSize?: number;
  sort?: string;
  q?: string;
  categoryId?: string;
  status?: ProductStatus | 'all';
  includeDeleted?: boolean;
};

export function useProducts(params: ProductListParams = {}) {
  const query = {
    ...params,
    status: params.status === 'all' ? undefined : params.status,
  };
  return useQuery({
    queryKey: qk.products(params),
    queryFn: () => api.get<Paginated<Product>>('/products', query),
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id: string | null) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => api.get<Product>(`/products/${id}`),
    enabled: !!id,
  });
}

export type ProductCreateInput = {
  name: string;
  categoryId: string;
  unit: Unit;
  basePrice: number;
  tradePrice: number;
  status?: ProductStatus;
};

export type ProductUpdateInput = {
  name?: string;
  categoryId?: string;
  unit?: Unit;
  basePrice?: number;
  tradePrice?: number;
  status?: ProductStatus;
};

const isProductListKey = (qk: readonly unknown[]) =>
  qk[0] === 'products' && qk.length === 2 && typeof qk[1] === 'object';

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProductCreateInput) => api.post<Product>('/products', body),
    onSuccess: (created) => {
      qc.setQueryData(['products', created.id], created);
      qc.invalidateQueries({ predicate: (q) => isProductListKey(q.queryKey) });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ProductUpdateInput }) =>
      api.patch<Product>(`/products/${id}`, body),
    onSuccess: (updated) => {
      qc.setQueryData(['products', updated.id], updated);
      qc.setQueriesData<Paginated<Product>>(
        { predicate: (q) => isProductListKey(q.queryKey) },
        (old) => old ? { ...old, data: old.data.map((p) => p.id === updated.id ? updated : p) } : old,
      );
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/products/${id}`),
    onSuccess: (_void, id) => {
      qc.removeQueries({ queryKey: ['products', id] });
      qc.removeQueries({ queryKey: ['products', id, 'history'] });
      qc.invalidateQueries({ predicate: (q) => isProductListKey(q.queryKey) });
    },
  });
}

export function useRestoreProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Product>(`/products/${id}/restore`),
    onSuccess: (restored) => {
      qc.setQueryData(['products', restored.id], restored);
      qc.invalidateQueries({ predicate: (q) => isProductListKey(q.queryKey) });
    },
  });
}

export function useProductHistory(id: string | null) {
  return useQuery({
    queryKey: qk.productHistory(id ?? ''),
    queryFn: () => api.get<ProductHistoryResponse>(`/products/${id}/history`),
    enabled: !!id,
  });
}

/* ── Categories ───────────────────────────────────────────── */

function unwrapList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  const maybe = (res as { data?: unknown })?.data;
  return Array.isArray(maybe) ? (maybe as T[]) : [];
}

function unwrapOne<T>(res: unknown): T {
  const d = (res as { data?: unknown })?.data;
  return (d ?? res) as T;
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => unwrapList<Category>(await api.get<unknown>('/categories')),
  });
}

export function useCategory(id: string | null) {
  return useQuery({
    queryKey: ['categories', id],
    queryFn: async () => unwrapOne<Category>(await api.get<unknown>(`/categories/${id}`)),
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CategoryInput) =>
      unwrapOne<Category>(await api.post<unknown>('/categories', body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<CategoryInput> }) =>
      unwrapOne<Category>(await api.patch<unknown>(`/categories/${id}`, body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useCategoryStats(date?: string) {
  return useQuery({
    queryKey: ['categories', 'stats', date ?? 'today'],
    queryFn: async () =>
      unwrapList<CategoryStats>(await api.get<unknown>('/categories/stats/daily', { date })),
  });
}

/* ── Customers ────────────────────────────────────────────── */

export type CustomerListParams = {
  page?: number;
  pageSize?: number;
  sort?: string;
  q?: string;
  type?: CustomerType | 'all';
  status?: ProductStatus | 'all';
};

export function useCustomers(params: CustomerListParams = {}) {
  const query = {
    ...params,
    type: params.type === 'all' ? undefined : params.type,
    status: params.status === 'all' ? undefined : params.status,
  };
  return useQuery({
    queryKey: qk.customers(params),
    queryFn: () => api.get<Paginated<Customer>>('/customers', query),
    placeholderData: keepPreviousData,
  });
}

export function useCustomer(id: string | null) {
  return useQuery({
    queryKey: id ? qk.customer(id) : ['customers', 'nil'],
    queryFn: () => api.get<Customer>(`/customers/${id}`),
    enabled: !!id,
  });
}

const isCustomerListKey = (qk: readonly unknown[]) =>
  qk[0] === 'customers' && qk.length === 2 && typeof qk[1] === 'object';

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CustomerInput) => api.post<Customer>('/customers', body),
    onSuccess: (created) => {
      qc.setQueryData(qk.customer(created.id), created);
      qc.invalidateQueries({ predicate: (q) => isCustomerListKey(q.queryKey) });
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CustomerInput> }) =>
      api.patch<Customer>(`/customers/${id}`, body),
    onSuccess: (updated) => {
      qc.setQueryData(qk.customer(updated.id), updated);
      qc.invalidateQueries({ predicate: (q) => isCustomerListKey(q.queryKey) });
    },
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/customers/${id}`),
    onSuccess: (_v, id) => {
      qc.removeQueries({ queryKey: qk.customer(id) });
      qc.invalidateQueries({ predicate: (q) => isCustomerListKey(q.queryKey) });
    },
  });
}

/* ── Stock entries ────────────────────────────────────────── */

export type StockEntryListParams = {
  page?: number;
  pageSize?: number;
  sort?: string;
  q?: string;
  productId?: string;
  condition?: StockCondition;
  available?: boolean;
  dateFrom?: string;
  dateTo?: string;
};

export function useStockEntries(params: StockEntryListParams = {}) {
  return useQuery({
    queryKey: qk.stockEntries(params),
    queryFn: () => api.get<Paginated<StockEntry>>('/stock-entries', params),
    placeholderData: keepPreviousData,
  });
}

export function useStockEntry(id: string | null) {
  return useQuery({
    queryKey: ['stock-entries', id],
    queryFn: () => api.get<StockEntryDetail>(`/stock-entries/${id}`),
    enabled: !!id,
  });
}

export type AvailableStockLot = {
  id: string;
  date: string;
  productId: string;
  batchId: string | null;
  quantity: number;
  remainingQuantity: number;
  basePrice: number;
  effectiveBuyPrice?: number | null;
  listPrice: number | null;
  tradePrice: number | null;
  mrp: number | null;
  condition: StockCondition;
  source: string;
  expiryDate: string | null;
  createdAt?: string;
  product?: { name: string; unit: string; tradePrice?: number };
  batch?: { id: string; date: string; source: string } | null;
};

export function useAvailableStockLots(opts: { productId?: string; condition?: StockCondition | '' } = {}) {
  const query = {
    available: true,
    pageSize: 200,
    ...opts,
    condition: opts.condition || undefined,
  };
  return useQuery({
    queryKey: ['stock-entries', 'available', opts],
    queryFn: () => api.get<Paginated<AvailableStockLot>>('/stock-entries', query),
    placeholderData: keepPreviousData,
  });
}

export type StockBatchListParams = {
  page?: number;
  pageSize?: number;
  sort?: string;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
};

export function useStockBatches(params: StockBatchListParams = {}) {
  return useQuery({
    queryKey: qk.stockBatches(params),
    queryFn: () => api.get<Paginated<StockBatch>>('/stock-batches', params),
    placeholderData: keepPreviousData,
  });
}

export function useDeleteStockBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/stock-batches/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-batches'] });
      qc.invalidateQueries({ queryKey: ['stock-entries'] });
      qc.invalidateQueries({ queryKey: ['stock-adjustments'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export type StockBatchLineInput = {
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
  condition?: StockCondition;
  expiryDate?: string;
  notes?: string;
};

export type StockBatchCreateInput = {
  date: string;
  source: string;
  notes?: string;
  lines: StockBatchLineInput[];
};

export function useCreateStockBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: StockBatchCreateInput) =>
      api.post<StockBatch>('/stock-batches', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-batches'] });
      qc.invalidateQueries({ queryKey: ['stock-entries'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCreateStockEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: StockEntryInput) =>
      api.post<StockEntry>('/stock-entries', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-entries'] });
      qc.invalidateQueries({ queryKey: ['stock-batches'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteStockEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/stock-entries/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-entries'] });
      qc.invalidateQueries({ queryKey: ['stock-batches'] });
      qc.invalidateQueries({ queryKey: ['stock-adjustments'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/* ── Stock adjustments ────────────────────────────────────── */

export type StockAdjustmentListParams = {
  page?: number;
  pageSize?: number;
  sort?: string;
  q?: string;
  productId?: string;
  vanId?: string;
  reason?: StockAdjustmentReason;
  location?: StockLocation;
  dateFrom?: string;
  dateTo?: string;
};

export function useStockAdjustments(params: StockAdjustmentListParams = {}) {
  return useQuery({
    queryKey: ['stock-adjustments', params],
    queryFn: () => api.get<Paginated<StockAdjustment>>('/stock-adjustments', params),
    placeholderData: keepPreviousData,
  });
}

export function useStockAdjustment(id: string | null) {
  return useQuery({
    queryKey: ['stock-adjustments', id],
    queryFn: () => api.get<StockAdjustmentDetail>(`/stock-adjustments/${id}`),
    enabled: !!id,
  });
}

export function useStockAdjustmentHistory(id: string | null) {
  return useQuery({
    queryKey: ['stock-adjustments', id, 'history'],
    queryFn: () => api.get<StockAdjustmentHistoryResponse>(`/stock-adjustments/${id}/history`),
    enabled: !!id,
  });
}

export type AdjustmentsByLotParams = {
  productId?: string;
  stockEntryId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export function useAdjustmentsByLot(params: AdjustmentsByLotParams = {}, enabled = true) {
  return useQuery({
    queryKey: qk.adjustmentsByLot(params),
    queryFn: () => api.get<AdjustmentByLotRow[]>('/stock-adjustments/by-lot', params),
    enabled,
  });
}

export function useStockAdjustmentAudit(params: { page: number; pageSize: number; enabled?: boolean }) {
  return useQuery({
    queryKey: ['stock-adjustments', 'audit', params.page, params.pageSize],
    queryFn: () =>
      api.get<StockAdjustmentAuditListResponse>('/stock-adjustments/audit', {
        page: params.page,
        pageSize: params.pageSize,
      }),
    enabled: params.enabled !== false,
    placeholderData: keepPreviousData,
  });
}

export function useCreateStockAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: StockAdjustmentInput) =>
      api.post<StockAdjustment>('/stock-adjustments', body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['stock-adjustments'] });
      qc.invalidateQueries({ queryKey: ['stock-entries'] });
      qc.invalidateQueries({ queryKey: ['stock-batches'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      if (vars.vanId) {
        qc.invalidateQueries({ queryKey: ['vans', vars.vanId, 'stock-summary'] });
        qc.invalidateQueries({ queryKey: ['vans', vars.vanId, 'activity'] });
      }
    },
  });
}

export function useDeleteStockAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/stock-adjustments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-adjustments'] });
      qc.invalidateQueries({ queryKey: ['stock-entries'] });
      qc.invalidateQueries({ queryKey: ['stock-batches'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['vans'] });
    },
  });
}

/* ── Vans & distribution ──────────────────────────────────── */

// Backend currently returns `vanId` plus daily summary fields (sales/distributed/returned).
// Normalize to the frontend Van shape so the rest of the app can use `v.id` etc.
type RawVan = Partial<Van> & {
  vanId?: string;
  sales?: number;
  distributed?: number;
  returned?: number;
  revenue?: number;
};
function normalizeVan(raw: RawVan): Van {
  const id = raw.id ?? raw.vanId ?? '';
  const hasSummary =
    raw.todaySummary !== undefined ||
    raw.sales !== undefined ||
    raw.distributed !== undefined ||
    raw.returned !== undefined;
  return {
    id,
    vanName: raw.vanName ?? '',
    driver: raw.driver ?? '',
    isActive: raw.isActive ?? true,
    todaySummary: hasSummary
      ? raw.todaySummary ?? {
          allocated: raw.distributed ?? 0,
          sold: Math.max(0, (raw.distributed ?? 0) - (raw.returned ?? 0)),
          revenue: raw.revenue ?? raw.sales ?? 0,
        }
      : undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function useVans() {
  return useQuery({
    queryKey: qk.vans,
    queryFn: async () => {
      const raw = await api.get<RawVan[]>('/vans');
      return (raw ?? []).map(normalizeVan);
    },
  });
}

export function useVan(id: string | null) {
  return useQuery({
    queryKey: id ? qk.van(id) : ['vans', 'nil'],
    queryFn: async () => normalizeVan(await api.get<RawVan>(`/vans/${id}`)),
    enabled: !!id,
  });
}

export function useCreateVan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: VanInput) => normalizeVan(await api.post<RawVan>('/vans', body)),
    onSuccess: (created) => {
      qc.setQueryData(qk.van(created.id), created);
      qc.setQueryData<Van[]>(qk.vans, (old) => old ? [...old, created] : old);
    },
  });
}

export function useUpdateVan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<VanInput> }) =>
      normalizeVan(await api.patch<RawVan>(`/vans/${id}`, body)),
    onSuccess: (updated) => {
      qc.setQueryData(qk.van(updated.id), updated);
      qc.setQueryData<Van[]>(qk.vans, (old) =>
        old ? old.map((v) => v.id === updated.id ? updated : v) : old,
      );
    },
  });
}

export function useDeleteVan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/vans/${id}`),
    onSuccess: (_v, id) => {
      qc.removeQueries({ queryKey: qk.van(id) });
      qc.setQueryData<Van[]>(qk.vans, (old) => old ? old.filter((v) => v.id !== id) : old);
    },
  });
}

export function useVanDistribution(vanId: string | null, date?: string) {
  return useQuery({
    queryKey: vanId ? qk.vanDistribution(vanId, date) : ['vans', 'nil', 'distribution'],
    queryFn: () => api.get<Distribution>(`/vans/${vanId}/distribution`, { date }),
    enabled: !!vanId,
  });
}

export function useVanStockSummary(vanId: string | null, date?: string) {
  return useQuery({
    queryKey: vanId ? qk.vanStockSummary(vanId, date) : ['vans', 'nil', 'stock-summary'],
    queryFn: () => api.get<VanStockSummary>(`/vans/${vanId}/stock-summary`, { date }),
    enabled: !!vanId,
    staleTime: 30_000,
  });
}

export function useVanActivity(vanId: string | null, date?: string) {
  return useQuery({
    queryKey: vanId ? qk.vanActivity(vanId, date) : ['vans', 'nil', 'activity'],
    queryFn: () => api.get<VanActivityResponse>(`/vans/${vanId}/activity`, { date }),
    enabled: !!vanId,
    staleTime: 15_000,
  });
}

export type DistributionListParams = {
  page?: number;
  pageSize?: number;
  sort?: string;
  q?: string;
  vanId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export function useDistributions(params: DistributionListParams = {}) {
  return useQuery({
    queryKey: qk.distributions(params),
    queryFn: () => api.get<Paginated<DistributionListItem>>('/distributions', params),
    placeholderData: keepPreviousData,
  });
}

export function useDistribution(id: string | null) {
  return useQuery({
    queryKey: id ? qk.distribution(id) : ['distributions', 'nil'],
    queryFn: () => api.get<DistributionDetail>(`/distributions/${id}`),
    enabled: !!id,
  });
}

export function useCreateDistribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { vanId: string; date: string; lines: { productId: string; allocated: number; batchId?: string | null; stockEntryId?: string }[] }) =>
      api.post<Distribution>('/distributions', body),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['distributions'] });
      qc.invalidateQueries({ queryKey: ['vans', vars.vanId, 'distribution'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['stock-entries'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteDistribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/distributions/${id}`),
    onSuccess: (_v, id) => {
      qc.removeQueries({ queryKey: qk.distribution(id) });
      qc.invalidateQueries({ queryKey: ['distributions'] });
      qc.invalidateQueries({ queryKey: ['vans'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['stock-entries'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useAddDistributionLine(vanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ distributionId, body }: { distributionId: string; body: { productId: string; allocated: number; batchId?: string | null; stockEntryId?: string } }) =>
      api.post(`/distributions/${distributionId}/lines`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vans', vanId, 'distribution'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['stock-entries'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateDistributionLine(vanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ distributionId, lineId, body }: { distributionId: string; lineId: string; body: { allocated?: number; returned?: number; damageReturned?: number } }) =>
      api.patch(`/distributions/${distributionId}/lines/${lineId}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vans', vanId, 'distribution'] });
      qc.invalidateQueries({ queryKey: ['vans', vanId, 'stock-summary'] });
      qc.invalidateQueries({ queryKey: ['vans', vanId, 'activity'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['stock-entries'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useSalvageDistributionLine(vanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ distributionId, lineId, body }: { distributionId: string; lineId: string; body: { quantity: number; salvagePrice: number; notes?: string } }) =>
      api.post(`/distributions/${distributionId}/lines/${lineId}/salvage`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vans', vanId, 'distribution'] });
      qc.invalidateQueries({ queryKey: ['vans', vanId, 'stock-summary'] });
      qc.invalidateQueries({ queryKey: ['vans', vanId, 'activity'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['stock-entries'] });
      // Salvage creates a new StockBatch too — Stock Movements must refetch.
      qc.invalidateQueries({ queryKey: ['stock-batches'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteDistributionLine(vanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ distributionId, lineId }: { distributionId: string; lineId: string }) =>
      api.del<void>(`/distributions/${distributionId}/lines/${lineId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vans', vanId, 'distribution'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['stock-entries'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/* ── Distribution Orders (restaurant/shop issue → confirm) ───── */

export type DistributionOrderListParams = {
  page?: number;
  pageSize?: number;
  sort?: string;
  q?: string;
  customerId?: string;
  status?: DistributionOrderStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
};

export function useDistributionOrders(params: DistributionOrderListParams = {}) {
  const query = { ...params, status: params.status === 'all' ? undefined : params.status };
  return useQuery({
    queryKey: qk.distributionOrders(params),
    queryFn: () => api.get<Paginated<DistributionOrderListItem>>('/distribution-orders', query),
    placeholderData: keepPreviousData,
  });
}

export function useDistributionOrder(id: string | null) {
  return useQuery({
    queryKey: id ? qk.distributionOrder(id) : ['distribution-orders', 'nil'],
    queryFn: () => api.get<DistributionOrderDetail>(`/distribution-orders/${id}`),
    enabled: !!id,
  });
}

export function useCreateDistributionOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      customerId: string;
      date: string;
      lines: { productId: string; requestedQty: number }[];
    }) => api.post<DistributionOrderDetail>('/distribution-orders', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['distribution-orders'] });
    },
  });
}

export function useConfirmDistributionOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: { lines: { productId: string; confirmedQty: number; price: number }[] };
    }) => api.post<{ distributionOrderId: string; saleId: string; invoiceId: string; total: number }>(
      `/distribution-orders/${id}/confirm`,
      body,
    ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['distribution-orders'] });
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCancelDistributionOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<DistributionOrderDetail>(`/distribution-orders/${id}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['distribution-orders'] });
    },
  });
}

/* ── Sales ────────────────────────────────────────────────── */

export type SaleInput = {
  vanId: string;
  date: string;
  items: { productId: string; price: number; qty: number }[];
};

export type SaleListParams = {
  page?: number;
  pageSize?: number;
  sort?: string;
  q?: string;
  vanId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export function useSales(params: SaleListParams = {}) {
  return useQuery({
    queryKey: qk.sales(params),
    queryFn: () => api.get<Paginated<SaleListItem>>('/sales', params),
    placeholderData: keepPreviousData,
  });
}

export function useSale(id: string | null) {
  return useQuery({
    queryKey: id ? qk.sale(id) : ['sales', 'nil'],
    queryFn: () => api.get<SaleDetail>(`/sales/${id}`),
    enabled: !!id,
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SaleInput) => api.post<InvoiceListItem>('/sales', body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['vans', vars.vanId, 'stock-summary'] });
      qc.invalidateQueries({ queryKey: ['vans', vars.vanId, 'activity'] });
    },
  });
}

export function useVoidSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/sales/${id}`),
    onSuccess: (_v, id) => {
      qc.removeQueries({ queryKey: qk.sale(id) });
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['vans'] });
    },
  });
}

export type DirectSaleInput = {
  customerId: string;
  date: string;
  items: { productId: string; price: number; qty: number }[];
};

export function useCreateDirectSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: DirectSaleInput) => api.post<InvoiceListItem>('/sales/direct', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useLastSale(vanId: string | null) {
  return useQuery({
    queryKey: ['sales', 'last', vanId],
    queryFn: () => api.get<InvoiceDetail>('/sales/last', { vanId: vanId ?? undefined }),
    enabled: !!vanId,
  });
}

/* ── Invoices ─────────────────────────────────────────────── */

export type InvoiceListParams = {
  page?: number;
  pageSize?: number;
  sort?: string;
  q?: string;
  status?: InvoiceStatus | 'all';
};

export function useInvoices(params: InvoiceListParams = {}) {
  const query = { ...params, status: params.status === 'all' ? undefined : params.status };
  return useQuery({
    queryKey: qk.invoices(params),
    queryFn: () => api.get<Paginated<InvoiceListItem>>('/invoices', query),
    placeholderData: keepPreviousData,
  });
}

export function useInvoice(id: string | null) {
  return useQuery({
    queryKey: id ? qk.invoice(id) : ['invoices', 'nil'],
    queryFn: () => api.get<InvoiceDetail>(`/invoices/${id}`),
    enabled: !!id,
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { status: InvoiceStatus } }) =>
      api.patch<InvoiceListItem>(`/invoices/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
}

export function useExportInvoices() {
  return useMutation({
    mutationFn: (params: InvoiceListParams = {}) => {
      const query = { ...params, status: params.status === 'all' ? undefined : params.status };
      return api.download('/invoices/export', query, `invoices-${new Date().toISOString().slice(0, 10)}.csv`);
    },
  });
}

export function useDownloadInvoicePdf() {
  return useMutation({
    mutationFn: (id: string) => api.download(`/invoices/${id}/pdf`, undefined, `invoice-${id}.pdf`),
  });
}

export function useDownloadPurchaseVoucher() {
  return useMutation({
    mutationFn: (id: string) => api.download(`/purchases/${id}/voucher.pdf`, undefined, `purchase-voucher-${id}.pdf`),
  });
}

/* ── Expenses ─────────────────────────────────────────────── */

export type ExpenseListParams = {
  page?: number;
  pageSize?: number;
  sort?: string;
  q?: string;
  category?: ExpenseCategory | 'all';
  status?: ExpenseStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
};

export function useExpenses(params: ExpenseListParams = {}) {
  const query = {
    ...params,
    category: params.category === 'all' ? undefined : params.category,
    status: params.status === 'all' ? undefined : params.status,
  };
  return useQuery({
    queryKey: qk.expenses(params),
    queryFn: () => api.get<Paginated<Expense>>('/expenses', query),
    placeholderData: keepPreviousData,
  });
}

export type ExpenseInput = {
  date: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  status?: ExpenseStatus;
  vendor?: string;
  paymentMethod?: string;
  bankAccountId?: string;
  notes?: string;
  vanId?: string;
};

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ExpenseInput) => api.post<Expense>('/expenses', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ExpenseInput> }) =>
      api.patch<Expense>(`/expenses/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/expenses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useExportExpenses() {
  return useMutation({
    mutationFn: (params: ExpenseListParams = {}) => {
      const query = {
        ...params,
        category: params.category === 'all' ? undefined : params.category,
        status: params.status === 'all' ? undefined : params.status,
      };
      return api.download('/expenses/export', query, `expenses-${new Date().toISOString().slice(0, 10)}.csv`);
    },
  });
}

/* ── Dashboard ────────────────────────────────────────────── */

export function useDashboardMetrics() {
  return useQuery({ queryKey: qk.dashboardMetrics, queryFn: () => api.get<DashboardMetrics>('/dashboard/metrics') });
}

export function useDashboardSeries(timeframe: Timeframe) {
  return useQuery({
    queryKey: qk.dashboardSeries(timeframe),
    queryFn: () => api.get<SeriesPoint[]>('/dashboard/series', { timeframe }),
  });
}

export function useDashboardVans() {
  return useQuery({ queryKey: qk.dashboardVans, queryFn: () => api.get<VanPerformance[]>('/dashboard/vans/performance') });
}

export function useDashboardCategories() {
  return useQuery({ queryKey: qk.dashboardCategories, queryFn: () => api.get<CategorySlice[]>('/dashboard/categories/breakdown') });
}

export function useDashboardLowStock(threshold?: number) {
  return useQuery({
    queryKey: qk.dashboardLowStock(threshold),
    queryFn: () => api.get<LowStockItem[]>('/dashboard/alerts/low-stock', { threshold }),
  });
}

export function useDashboardActivity(limit = 10) {
  return useQuery({
    queryKey: qk.dashboardActivity(limit),
    queryFn: () => api.get<ActivityItem[]>('/dashboard/activity', { limit }),
  });
}

/* ── Accounting ───────────────────────────────────────────── */

export function useLedger(month?: string) {
  return useQuery({
    queryKey: qk.ledger(month),
    queryFn: () => api.get<LedgerSummary>('/accounting/ledger', { month }),
  });
}

export function useVanProfitability(month?: string) {
  return useQuery({
    queryKey: qk.vanProfitability(month),
    queryFn: () => api.get<VanProfitabilityRow[]>('/accounting/van-profitability', { month }),
  });
}

export type BatchProfitabilityParams = {
  page?: number;
  pageSize?: number;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
};

export type BatchVanProfitabilityParams = {
  page?: number;
  pageSize?: number;
  month?: string;
  vanId?: string;
  batchId?: string;
  productId?: string;
  sort?: string;
};

export function useBatchProfitability(params: BatchProfitabilityParams = {}) {
  return useQuery({
    queryKey: qk.batches(params),
    queryFn: () => api.get<Paginated<BatchProfitSummary>>('/accounting/batches', params),
    placeholderData: keepPreviousData,
  });
}

export function useBatchVanProfitability(params: BatchVanProfitabilityParams = {}) {
  return useQuery({
    queryKey: qk.batchVanProfitability(params),
    queryFn: () => api.get<BatchVanProfitabilityResponse>('/accounting/batch-van-profitability', params),
    placeholderData: keepPreviousData,
  });
}

export function useBatchProfitabilityDetail(batchId: string | null) {
  return useQuery({
    queryKey: batchId ? qk.batch(batchId) : ['accounting', 'batches', 'detail', 'nil'],
    queryFn: () => api.get<BatchProfitSummary>(`/accounting/batches/${batchId}`),
    enabled: !!batchId,
  });
}

/* ── Reports ──────────────────────────────────────────────── */

export type ReportParams = {
  dateFrom?: string;
  dateTo?: string;
};

export function useReport(type: string | null, params: ReportParams = {}, enabled = true) {
  return useQuery({
    queryKey: type ? qk.report(type, params) : ['reports', 'nil'],
    queryFn: () => api.get<ReportResponse>(`/reports/${type}`, params),
    enabled: !!type && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useDownloadReport() {
  return useMutation({
    mutationFn: ({ type, params = {} }: { type: string; params?: ReportParams }) =>
      api.download(`/reports/${type}`, { ...params, format: 'csv' }, `${type}-${new Date().toISOString().slice(0, 10)}.csv`),
  });
}

/* ── Search ───────────────────────────────────────────────── */

export type SearchParams = {
  q?: string;
  kind?: SearchKind;
  dateRange?: '7d' | '30d' | '90d' | 'ytd';
  vanId?: string;
  category?: string;
  status?: SearchStatus | 'all';
  page?: number;
  pageSize?: number;
};

export function useSearch(params: SearchParams, enabled = true) {
  const query = {
    ...params,
    kind: params.kind === 'all' ? undefined : params.kind,
    status: params.status === 'all' ? undefined : params.status,
    vanId: params.vanId === 'all' ? undefined : params.vanId,
    category: params.category === 'all' ? undefined : params.category,
  };
  return useQuery({
    queryKey: qk.search(params),
    queryFn: () => api.get<Paginated<SearchRow>>('/search', query),
    enabled,
    placeholderData: keepPreviousData,
  });
}
