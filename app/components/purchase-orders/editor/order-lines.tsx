import { money } from "../purchase-order-ui";
import { previewPurchaseOrderLine } from "@/app/lib/purchase-order-rules";
import type { Line } from "./types";
export function OrderLines({
  lines,
  errors,
  warnings,
  readOnly,
  onUpdate,
  onSearch,
  onSelectProduct,
  onSelectPackaging,
  onAdd,
  onRemove,
}: {
  lines: Line[];
  errors: Record<string, string>;
  warnings: Record<string, string>;
  readOnly: boolean;
  onUpdate: (index: number, patch: Partial<Line>) => void;
  onSearch: (index: number, query: string) => void;
  onSelectProduct: (index: number, product: NonNullable<Line["product"]>) => void;
  onSelectPackaging: (index: number, id: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <section className="poe-lines">
      <header>
        <div>
          <span>LÍNEAS</span>
          <h2>Productos a comprar</h2>
        </div>
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
              <th>IVA %</th>
              <th>Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.length ? (
              lines.map((line, index) => {
                const preview = previewPurchaseOrderLine(line);
                return (
                  <tr key={index}>
                    <td>
                      <input
                        aria-label={`Producto línea ${index + 1}`}
                        disabled={readOnly}
                        value={line.query}
                        placeholder="Buscar producto"
                        onChange={(event) => onSearch(index, event.target.value)}
                      />
                      {line.results.length > 0 && (
                        <div className="poe-product-results">
                          {line.results.map((product) => (
                            <button type="button" key={product.id} onClick={() => onSelectProduct(index, product)}>
                              {product.name}
                            </button>
                          ))}
                        </div>
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
                    </td>
                    <td>
                      <input
                        aria-label={`Packs línea ${index + 1}`}
                        disabled={readOnly}
                        type="number"
                        min="1"
                        step="1"
                        value={line.packageQuantity}
                        onChange={(event) => onUpdate(index, { packageQuantity: event.target.value })}
                      />
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
                    </td>
                    <td>
                      <select
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
