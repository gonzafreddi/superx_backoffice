import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { money } from "../purchase-order-ui";
import { previewPurchaseOrderLine } from "@/app/lib/purchase-order-rules";
import type { Tax } from "@/app/lib/tax-contract";
import type { Line } from "./types";

// The lines table scrolls horizontally, which would clip an absolutely positioned
// dropdown; results are pinned to the viewport under their input instead.
function ProductResults({ anchors, index, children }: { anchors: RefObject<Array<HTMLInputElement | null>>; index: number; children: ReactNode }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    const update = () => setRect(anchors.current[index]?.getBoundingClientRect() ?? null);
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchors, index]);
  if (!rect) return null;
  return (
    <div className="poe-product-results" style={{ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 300) }}>
      {children}
    </div>
  );
}

export function OrderLines({
  lines,
  errors,
  warnings,
  readOnly,
  taxes,
  taxCatalogAvailable,
  onUpdate,
  onSearch,
  onSelectProduct,
  onSelectPackaging,
  onAdd,
  onRemove,
  onCreateProduct,
  focusPacks,
}: {
  lines: Line[];
  errors: Record<string, string>;
  warnings: Record<string, string>;
  readOnly: boolean;
  taxes: Tax[];
  taxCatalogAvailable: boolean;
  onUpdate: (index: number, patch: Partial<Line>) => void;
  onSearch: (index: number, query: string) => void;
  onSelectProduct: (index: number, product: NonNullable<Line["product"]>) => void;
  onSelectPackaging: (index: number, id: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onCreateProduct: (index: number, query: string, trigger: HTMLInputElement) => void;
  focusPacks: { index: number; token: number } | null;
}) {
  const packRefs = useRef<Array<HTMLInputElement | null>>([]);
  const productRefs = useRef<Array<HTMLInputElement | null>>([]);
  useEffect(() => { if (focusPacks) packRefs.current[focusPacks.index]?.focus(); }, [focusPacks]);
  return (
    <section className="poe-lines">
      <header>
        <div>
          <span>Productos</span>
          <h2>Productos a comprar</h2>
        </div>
        <span className="poe-line-count">{lines.length} {lines.length === 1 ? "línea" : "líneas"}</span>
      </header>
      <div className="poe-lines-scroll">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Presentación</th>
              <th>Packs</th>
              <th>U./pack</th>
              <th>Unidades</th>
              <th>Costo pack</th>
              <th>Costo unit.</th>
              <th>Desc. $</th>
              <th>Impuestos</th>
              <th>Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.length ? (
              lines.map((line, index) => {
                const preview = previewPurchaseOrderLine({ ...line, ...(taxCatalogAvailable ? { taxes: taxes.filter((tax) => line.taxIds.includes(tax.id)) } : {}) });
                return (
                  <tr key={index}>
                    <td>
                      <input
                        ref={(element) => { productRefs.current[index] = element; }}
                        aria-label={`Producto línea ${index + 1}`}
                        disabled={readOnly}
                        value={line.query}
                        placeholder="Buscar producto"
                        onChange={(event) => onSearch(index, event.target.value)}
                      />
                      {line.query.trim() && !line.product && (
                        <ProductResults anchors={productRefs} index={index}>
                          {line.results.length ? line.results.map((product) => (
                            <button type="button" key={product.id} onClick={() => onSelectProduct(index, product)}>
                              {product.name}
                            </button>
                          )) : <span>Sin resultados</span>}
                          <button type="button" className="poe-create-product" onMouseDown={(event) => { event.preventDefault(); onCreateProduct(index, line.query.trim(), event.currentTarget.closest("td")?.querySelector("input") as HTMLInputElement); }}>＋ Crear producto «{line.query.trim()}»</button>
                        </ProductResults>
                      )}
                      {errors[`item-${index}-product`] && <small>{errors[`item-${index}-product`]}</small>}
                    </td>
                    <td>
                      {line.product && (
                        <>
                          {line.packagings.length ? (
                            <select
                              aria-label={`Presentación línea ${index + 1}`}
                              disabled={readOnly}
                              value={line.packagingId}
                              onChange={(event) => onSelectPackaging(index, event.target.value)}
                            >
                              <option value="">Manual</option>
                              {line.packagings.map((option) => (
                                <option value={option.id} key={option.id}>
                                  {option.name}
                                </option>
                              ))}
                            </select>
                          ) : null}
                          {!line.packagingId && (
                            <input
                              aria-label={`Nombre presentación línea ${index + 1}`}
                              disabled={readOnly}
                              value={line.packagingName}
                              placeholder="Presentación"
                              onChange={(event) => onUpdate(index, { packagingName: event.target.value })}
                            />
                          )}
                        </>
                      )}
                      {errors[`item-${index}-packagingName`] && <small>{errors[`item-${index}-packagingName`]}</small>}
                    </td>
                    <td>
                      <input
                        ref={(element) => { packRefs.current[index] = element; }}
                        aria-label={`Packs línea ${index + 1}`}
                        disabled={readOnly}
                        type="number"
                        min="1"
                        step="1"
                        value={line.packageQuantity}
                        onChange={(event) => onUpdate(index, { packageQuantity: event.target.value })}
                      />
                      {errors[`item-${index}-quantity`] && <small>{errors[`item-${index}-quantity`]}</small>}
                    </td>
                    <td>
                      <input
                        aria-label={`Unidades por pack línea ${index + 1}`}
                        disabled={readOnly || Boolean(line.packagingId)}
                        type="number"
                        min="1"
                        step="1"
                        value={line.unitsPerPack}
                        onChange={(event) => onUpdate(index, { unitsPerPack: event.target.value })}
                      />
                      {errors[`item-${index}-units`] && <small>{errors[`item-${index}-units`]}</small>}
                    </td>
                    <td className="poe-number">{preview.unitQuantity}</td>
                    <td>
                      <input
                        aria-label={`Costo por pack línea ${index + 1}`}
                        disabled={readOnly}
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.costPerPackage}
                        onChange={(event) => onUpdate(index, { costPerPackage: event.target.value })}
                      />
                      {errors[`item-${index}-cost`] && <small>{errors[`item-${index}-cost`]}</small>}
                    </td>
                    <td className="poe-number">{money(preview.unitCost)}</td>
                    <td>
                      <input
                        aria-label={`Descuento línea ${index + 1}`}
                        disabled={readOnly}
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.discountAmount}
                        onChange={(event) => onUpdate(index, { discountAmount: event.target.value })}
                      />
                      {errors[`item-${index}-discount`] && <small>{errors[`item-${index}-discount`]}</small>}
                    </td>
                    <td>
                      {taxCatalogAvailable ? <details className="poe-tax-picker"><summary aria-label={`Impuestos línea ${index + 1}`}>{line.taxIds.length ? `${line.taxIds.length} imp.` : "Sin impuestos"}</summary><div role="group" aria-label={`Seleccionar impuestos línea ${index + 1}`}>{taxes.map((tax) => <label key={tax.id}><input type="checkbox" disabled={readOnly} checked={line.taxIds.includes(tax.id)} onChange={() => onUpdate(index, { taxRate: "0", taxIds: line.taxIds.includes(tax.id) ? line.taxIds.filter((id) => id !== tax.id) : [...line.taxIds, tax.id] })} /><span>{tax.name} · {tax.rate}% {tax.includeInCost && <small>+ costo</small>}</span></label>)}</div></details> : <><select
                        aria-label={`IVA línea ${index + 1}`}
                        disabled={readOnly}
                        value={["0", "10.5", "21", "27"].includes(line.taxRate) ? line.taxRate : "other"}
                        onChange={(event) =>
                          onUpdate(index, { taxRate: event.target.value === "other" ? "" : event.target.value })
                        }
                      >
                        <option value="0">0</option>
                        <option value="10.5">10,5</option>
                        <option value="21">21</option>
                        <option value="27">27</option>
                        <option value="other">Otro</option>
                      </select>
                      {!["0", "10.5", "21", "27"].includes(line.taxRate) && (
                        <input
                          aria-label={`Otro IVA línea ${index + 1}`}
                          disabled={readOnly}
                          type="number"
                          min="0"
                          max="100"
                          value={line.taxRate}
                          onChange={(event) => onUpdate(index, { taxRate: event.target.value })}
                        />
                      )}
                      </>}
                      {errors[`item-${index}-tax`] && <small>{errors[`item-${index}-tax`]}</small>}
                    </td>
                    <td className="poe-number">
                      <strong>{money(preview.total)}</strong>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="danger-text"
                        aria-label={`Quitar línea ${index + 1}`}
                        disabled={readOnly || lines.length === 1}
                        onClick={() => onRemove(index)}
                      >
                        ×
                      </button>
                      {warnings[`item-${index}-duplicate`] && (
                        <small className="poe-warning">{warnings[`item-${index}-duplicate`]}</small>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={11} className="poe-empty">
                  Agregá productos a la orden
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <button type="button" className="button secondary poe-add-line" onClick={onAdd}>
          + Agregar línea
        </button>
      )}
    </section>
  );
}
