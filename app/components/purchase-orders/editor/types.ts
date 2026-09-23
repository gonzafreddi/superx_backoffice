import type { PurchaseOrderPackaging, PurchaseOrderProduct } from "@/app/lib/purchase-order-contract";
export type Line = {
  product: PurchaseOrderProduct | null;
  packagingId: string;
  packagingName: string;
  unitsPerPack: string;
  packageQuantity: string;
  costPerPackage: string;
  discountAmount: string;
  taxRate: string;
  packagings: PurchaseOrderPackaging[];
  query: string;
  results: PurchaseOrderProduct[];
};
export type OrderSummaryValues = {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  freightAmount: number;
  otherChargesAmount: number;
  total: number;
  lineCount: number;
  unitCount: number;
};
