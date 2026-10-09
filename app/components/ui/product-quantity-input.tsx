"use client";

import { useState, type InputHTMLAttributes } from "react";
import { parseQuantity, quantityInput, type SaleMode } from "@/app/lib/quantity-rules";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & { value: number; saleMode?: SaleMode; onChange: (quantity: number) => void };
/** Keep incomplete/locale decimal input while notifying callers with integer grams. */
export function ProductQuantityInput({ value, saleMode, onChange, min, max, ...props }: Props) {
  const [text, setText] = useState(() => quantityInput(value, saleMode));
  const [previous, setPrevious] = useState({ value, saleMode });
  if (!Object.is(previous.value, value) || previous.saleMode !== saleMode) {
    setPrevious({ value, saleMode });
    if (previous.saleMode !== saleMode || !Object.is(parseQuantity(text, saleMode), value)) setText(Number.isFinite(value) ? quantityInput(value, saleMode) : "");
  }
  return <input {...props} type={saleMode === "WEIGHT" ? "text" : "number"} min={saleMode === "WEIGHT" ? undefined : min} max={saleMode === "WEIGHT" ? undefined : max} inputMode={saleMode === "WEIGHT" ? "decimal" : "numeric"} value={text} aria-valuemin={typeof min === "number" ? Number(quantityInput(min, saleMode)) : undefined} aria-valuemax={typeof max === "number" ? Number(quantityInput(max, saleMode)) : undefined} onChange={(event) => { const next = parseQuantity(event.target.value, saleMode); setText(event.target.value); onChange(next); }} />;
}
