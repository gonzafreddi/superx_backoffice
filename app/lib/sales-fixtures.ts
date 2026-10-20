import type {
  SalesRange,
  DailyMetrics,
  DailySales,
  CashDaily,
  SalesSummary,
  SalesBreakdown,
  BreakdownBy,
  StockValuation,
} from "./sales-contract";
import { cents, decimal, rangeDays, shiftDate, sumMoney } from "./sales-rules";
const amount = (value: number) => decimal(BigInt(value));
const ratio = (value: string, pct: number) =>
  decimal((cents(value) * BigInt(pct)) / BigInt(100));
export function fixtureDaily(range: SalesRange): DailySales {
  const rows = Array.from({ length: rangeDays(range) }, (_, i) => {
    const date = shiftDate(range.from, i),
      weekday = new Date(`${date}T12:00Z`).getUTCDay(),
      seed = Number(date.replaceAll("-", ""));
    const orders = seed % 13 === 0 ? 0 : 19 + (seed % 27),
      grossSales = amount(orders * (1850000 + (seed % 9) * 175000));
    const discounts = ratio(grossSales, 4),
      netSales = decimal(cents(grossSales) - cents(discounts)),
      cogs = ratio(netSales, 64 + (seed % 8)),
      grossMargin = decimal(cents(netSales) - cents(cogs)),
      deliveryFees = amount(orders * 85000),
      billed = sumMoney([netSales, deliveryFees]);
    return {
      date,
      weekday,
      orders,
      units: orders * 7,
      grossSales,
      discounts,
      netSales,
      deliveryFees,
      billed,
      cogs,
      grossMargin,
      grossMarginPct: orders
        ? Number((cents(grossMargin) * BigInt(10000)) / cents(netSales)) / 100
        : null,
      averageTicket: orders ? decimal(cents(billed) / BigInt(orders)) : "0.00",
    };
  });
  const total = (key: keyof DailyMetrics) =>
    sumMoney(rows.map((row) => String(row[key])));
  const orders = rows.reduce((sum, row) => sum + row.orders, 0),
    grossSales = total("grossSales"),
    netSales = total("netSales"),
    grossMargin = total("grossMargin"),
    billed = total("billed");
  return {
    rows,
    totals: {
      orders,
      units: orders * 7,
      grossSales,
      discounts: total("discounts"),
      netSales,
      deliveryFees: total("deliveryFees"),
      billed,
      cogs: total("cogs"),
      grossMargin,
      grossMarginPct: Number(netSales)
        ? Number((cents(grossMargin) * BigInt(10000)) / cents(netSales)) / 100
        : null,
      averageTicket: orders ? decimal(cents(billed) / BigInt(orders)) : "0.00",
    },
  };
}
export function fixtureCash(range: SalesRange): CashDaily {
  const methods = ["CASH", "BANK_TRANSFER", "MERCADO_PAGO"];
  const rows = fixtureDaily(range).rows.map((row) => {
    const total = ratio(row.billed, 96),
      refunds = ratio(total, 1),
      cash = ratio(total, 38),
      bank = ratio(total, 27);
    return {
      date: row.date,
      byMethod: {
        CASH: cash,
        BANK_TRANSFER: bank,
        MERCADO_PAGO: decimal(cents(total) - cents(cash) - cents(bank)),
      },
      total,
      refunds,
      net: decimal(cents(total) - cents(refunds)),
      payments: row.orders,
    };
  });
  const byMethod = Object.fromEntries(
    methods.map((method) => [
      method,
      sumMoney(
        rows.map((row) => row.byMethod[method as keyof typeof row.byMethod]),
      ),
    ]),
  );
  return {
    methods,
    rows,
    totals: {
      byMethod,
      total: sumMoney(rows.map((r) => r.total)),
      refunds: sumMoney(rows.map((r) => r.refunds)),
      net: sumMoney(rows.map((r) => r.net)),
      payments: rows.reduce((s, r) => s + r.payments, 0),
    },
    byAccount: methods.map((method, i) => ({
      accountId: String(i + 1),
      accountName: ["Caja del local", "Banco Galicia", "Mercado Pago"][i],
      accountType: method,
      total: byMethod[method],
    })),
  };
}
export function fixtureStock(
  groupBy: "category" | "product",
  warehouseId?: string,
): StockValuation {
  const labels =
    groupBy === "category"
      ? ["Almacén", "Bebidas", "Lácteos", "Limpieza", "Verdulería", "Panadería"]
      : [
          "Yerba mate 1 kg",
          "Aceite girasol 900 ml",
          "Leche entera 1 L",
          "Jabón líquido 3 L",
          "Tomate redondo",
          "Pan integral",
        ];
  const rows = labels.map((label, i) => {
    const costValue = amount((6 - i) * (warehouseId ? 13500000 : 24500000)),
      saleValue = decimal((cents(costValue) * BigInt(145)) / BigInt(100));
    return {
      key: String(i + 1),
      label,
      skus: groupBy === "product" ? 1 : 16 + i * 3,
      costValue,
      saleValue,
      potentialMargin: decimal(cents(saleValue) - cents(costValue)),
      potentialMarginPct: 31.03,
      share: ((6 - i) / 21) * 100,
      ...(groupBy === "product"
        ? {
            quantity: i === 4 ? 42.375 : 120 + i * 17,
            unit: i === 4 ? ("kg" as const) : ("u" as const),
          }
        : {}),
    };
  });
  return {
    rows,
    totals: {
      skus: rows.reduce((s, r) => s + r.skus, 0),
      costValue: sumMoney(rows.map((r) => r.costValue)),
      saleValue: sumMoney(rows.map((r) => r.saleValue)),
      potentialMargin: sumMoney(rows.map((r) => r.potentialMargin)),
      potentialMarginPct: 31.03,
      missingCost: 3,
      missingPrice: 1,
    },
  };
}
export function fixtureSummary(range: SalesRange): SalesSummary {
  const days = rangeDays(range),
    previousRange = {
      from: shiftDate(range.from, -days),
      to: shiftDate(range.from, -1),
    };
  const kpisFor = (r: SalesRange) => {
    const daily = fixtureDaily(r).totals,
      cash = fixtureCash(r),
      expenses = ratio(daily.grossSales, 12);
    return {
      ...daily,
      customers: Math.round(daily.orders * 0.71),
      newCustomers: Math.round(daily.orders * 0.13),
      refunds: cash.totals.refunds,
      operatingExpenses: expenses,
      netResult: decimal(
        cents(daily.grossMargin) +
          cents(daily.deliveryFees) -
          cents(cash.totals.refunds) -
          cents(expenses),
      ),
      netMarginPct: Number(daily.billed)
        ? (Number(
            decimal(
              cents(daily.grossMargin) +
                cents(daily.deliveryFees) -
                cents(cash.totals.refunds) -
                cents(expenses),
            ),
          ) /
            Number(daily.billed)) *
          100
        : null,
      collected: cash.totals.net,
      cancelledOrders: Math.round(daily.orders * 0.025),
      cancelledAmount: ratio(daily.billed, 2),
      costCoverage: 97.8,
    };
  };
  const kpis = kpisFor(range),
    previous = kpisFor(previousRange),
    stock = fixtureStock("category").totals;
  return {
    range: { ...range, days },
    previousRange,
    kpis,
    previous,
    deltaPct: Object.fromEntries(
      Object.entries(kpis).map(([key, value]) => {
        const before = Number(previous[key as keyof typeof previous]);
        return [
          key,
          before ? ((Number(value) - before) / Math.abs(before)) * 100 : null,
        ];
      }),
    ),
    receivable: "485600.00",
    expensesByCategory: [
      { category: "Alquiler", amount: ratio(kpis.operatingExpenses, 50) },
      { category: "Servicios", amount: ratio(kpis.operatingExpenses, 30) },
      {
        category: "Logística",
        amount: decimal(
          cents(kpis.operatingExpenses) -
            cents(ratio(kpis.operatingExpenses, 50)) -
            cents(ratio(kpis.operatingExpenses, 30)),
        ),
      },
    ],
    inventory: {
      costValue: stock.costValue,
      saleValue: stock.saleValue,
      potentialMargin: stock.potentialMargin,
      roiAnnualPct:
        (((Number(kpis.grossMargin) / Number(stock.costValue)) * 365) / days) *
        100,
      inventoryDays: Number(kpis.cogs)
        ? Number(stock.costValue) / (Number(kpis.cogs) / days)
        : null,
    },
  };
}
export function fixtureBreakdown(
  range: SalesRange,
  by: BreakdownBy,
  limit = 20,
): SalesBreakdown {
  const labels =
    by === "hour"
      ? Array.from({ length: 24 }, (_, i) => `${i} h`)
      : by === "weekday"
        ? [
            "Domingo",
            "Lunes",
            "Martes",
            "Miércoles",
            "Jueves",
            "Viernes",
            "Sábado",
          ]
        : by === "zone"
          ? ["Centro", "Norte", "Sur", "Oeste"]
          : by === "payment_method"
            ? ["Efectivo", "Transferencia", "Mercado Pago"]
            : fixtureStock(by === "product" ? "product" : "category").rows.map(
                (r) => r.label,
              );
  const weights = labels.map((_, i) =>
      by === "hour" ? (i < 8 || i > 21 ? 0 : 4 + (i % 7)) : labels.length - i,
    ),
    sum = weights.reduce((s, n) => s + n, 0),
    totals = fixtureDaily(range).totals;
  const rows = labels.map((label, i) => {
    const grossSales = decimal(
        (cents(totals.grossSales) * BigInt(weights[i])) / BigInt(sum),
      ),
      discounts = ratio(grossSales, 4),
      netSales = decimal(cents(grossSales) - cents(discounts)),
      cogs = ratio(netSales, 65 + (i % 8)),
      grossMargin = decimal(cents(netSales) - cents(cogs));
    return {
      key:
        by === "payment_method"
          ? ["CASH", "BANK_TRANSFER", "MERCADO_PAGO"][i]
          : String(i),
      label,
      orders: Math.round((totals.orders * weights[i]) / sum),
      units: Math.round((totals.units * weights[i]) / sum),
      grossSales,
      netSales,
      cogs,
      grossMargin,
      grossMarginPct: Number(netSales)
        ? Number((cents(grossMargin) * BigInt(10000)) / cents(netSales)) / 100
        : null,
      share: 0,
    };
  });
  const grossSales = sumMoney(rows.map((r) => r.grossSales)),
    netSales = sumMoney(rows.map((r) => r.netSales)),
    cogs = sumMoney(rows.map((r) => r.cogs)),
    grossMargin = sumMoney(rows.map((r) => r.grossMargin));
  for (const row of rows) {
    row.share = Number(netSales)
      ? (Number(row.netSales) / Number(netSales)) * 100
      : 0;
  }
  return {
    by,
    rows: rows.slice(0, by === "hour" || by === "weekday" ? undefined : limit),
    totals: {
      orders: totals.orders,
      units: totals.units,
      grossSales,
      netSales,
      cogs,
      grossMargin,
      grossMarginPct: Number(netSales)
        ? Number((cents(grossMargin) * BigInt(10000)) / cents(netSales)) / 100
        : null,
      share: 100,
    },
  };
}
