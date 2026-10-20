export type SalesRange = { from: string; to: string };
export type DailyMetrics = {
  orders: number;
  units: number;
  grossSales: string;
  discounts: string;
  netSales: string;
  deliveryFees: string;
  billed: string;
  cogs: string;
  grossMargin: string;
  grossMarginPct: number | null;
  averageTicket: string;
};
export type DailySales = {
  rows: (DailyMetrics & { date: string; weekday: number })[];
  totals: DailyMetrics;
};
export type SalesKpis = DailyMetrics & {
  customers: number;
  newCustomers: number;
  refunds: string;
  operatingExpenses: string;
  netResult: string;
  netMarginPct: number | null;
  collected: string;
  cancelledOrders: number;
  cancelledAmount: string;
  costCoverage: number;
};
export type SalesSummary = {
  range: SalesRange & { days: number };
  previousRange: SalesRange;
  kpis: SalesKpis;
  previous: SalesKpis;
  deltaPct: Partial<Record<keyof SalesKpis, number | null>>;
  receivable: string;
  expensesByCategory: { category: string; amount: string }[];
  inventory: {
    costValue: string;
    saleValue: string;
    potentialMargin: string;
    roiAnnualPct: number | null;
    inventoryDays: number | null;
  };
};
export type CashMetrics = {
  byMethod: Record<string, string>;
  total: string;
  refunds: string;
  net: string;
  payments: number;
};
export type CashDaily = {
  methods: string[];
  rows: (CashMetrics & { date: string })[];
  totals: CashMetrics;
  byAccount: {
    accountId: string;
    accountName: string;
    accountType: string;
    total: string;
  }[];
};
export type BreakdownBy =
  "product" | "category" | "zone" | "payment_method" | "hour" | "weekday";
export type BreakdownMetrics = Pick<
  DailyMetrics,
  "orders" | "units" | "grossSales" | "netSales" | "cogs" | "grossMargin" | "grossMarginPct"
> & { share: number };
export type SalesBreakdown = {
  by: BreakdownBy;
  rows: (BreakdownMetrics & { key: string; label: string })[];
  totals: BreakdownMetrics;
};
export type StockMetrics = {
  skus: number;
  costValue: string;
  saleValue: string;
  potentialMargin: string;
  potentialMarginPct: number | null;
};
export type StockValuation = {
  totals: StockMetrics & { missingCost: number; missingPrice: number };
  rows: (StockMetrics & {
    key: string;
    label: string;
    share: number;
    quantity?: number;
    unit?: "kg" | "u";
  })[];
};
