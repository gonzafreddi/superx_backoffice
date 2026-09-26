"use client";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/immutability */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Notice } from "@/app/components/ui/notice";
import { SearchSelect } from "@/app/components/ui/search-select";
import { ProductQuickCreateDialog } from "@/app/components/products/product-quick-create-dialog";
import { SupplierDialog } from "@/app/components/suppliers/supplier-form";
import { getStoredUser } from "@/app/lib/auth-api";
import { locationApi } from "@/app/lib/location-api";
import { purchaseOrderApi } from "@/app/lib/purchase-order-api";
import { taxApi } from "@/app/lib/tax-api";
import type { Tax } from "@/app/lib/tax-contract";
import type {
  CreatePurchaseOrderDto,
  PurchaseOrder,
  PurchaseOrderSupplierContext,
} from "@/app/lib/purchase-order-contract";
import {
  addDaysToDate,
  duplicateLineWarnings,
  isDirty,
  summarizePurchaseOrder,
  validatePurchaseOrderInput,
} from "@/app/lib/purchase-order-rules";
import { supplierApi } from "@/app/lib/supplier-api";
import { EditorHeader } from "./editor-header";
import { OrderLines } from "./order-lines";
import { OrderSummary } from "./order-summary";
import { SupplierContext } from "./supplier-context";
import { money } from "../purchase-order-ui";
import type { Line } from "./types";
type Form = {
  supplierId: string;
  warehouseId: string;
  currency: string;
  orderDate: string;
  expectedDate: string;
  paymentCondition: "CASH" | "CREDIT" | "TRANSFER" | "OTHER";
  paymentTermDays: string;
  dueDate: string;
  freightAmount: string;
  otherChargesAmount: string;
  reference: string;
  notes: string;
  lines: Line[];
};
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const DUPLICATE_SKIPPED_KEY = "superx.po-duplicate-skipped";
const line = (): Line => ({
  product: null,
  packagingId: "",
  packagingName: "",
  unitsPerPack: "",
  packageQuantity: "1",
  costPerPackage: "",
  discountAmount: "0",
  taxRate: "0",
  taxIds: [],
  packagings: [],
  query: "",
  results: [],
});
const blank = (): Form => ({
  supplierId: "",
  warehouseId: "",
  currency: "ARS",
  orderDate: today(),
  expectedDate: "",
  paymentCondition: "CREDIT",
  paymentTermDays: "",
  dueDate: "",
  freightAmount: "0",
  otherChargesAmount: "0",
  reference: "",
  notes: "",
  lines: [line()],
});
const fromOrder = (order: PurchaseOrder, taxes: Tax[] = [], catalogAvailable = false): Form => ({
  supplierId: order.supplierId,
  warehouseId: order.warehouseId,
  currency: order.currency,
  orderDate: order.orderDate?.slice(0, 10) ?? today(),
  expectedDate: order.expectedDate?.slice(0, 10) ?? "",
  paymentCondition: order.paymentCondition,
  paymentTermDays: order.paymentTermDays == null ? "" : String(order.paymentTermDays),
  dueDate: order.dueDate ?? "",
  freightAmount: order.freightAmount.toFixed(2),
  otherChargesAmount: order.otherChargesAmount.toFixed(2),
  reference: order.reference ?? "",
  notes: order.notes ?? "",
  lines: order.items.map((item) => ({
    product: item.product,
    packagingId: item.packagingId ?? "",
    packagingName: item.packagingName,
    unitsPerPack: String(item.unitsPerPack),
    packageQuantity: String(item.packageQuantity),
    costPerPackage: String(item.costPerPackage),
    discountAmount: String(item.discountAmount),
    taxRate: String(item.taxRate),
    taxIds: item.taxes?.length ? item.taxes.map((tax) => tax.taxId).filter((id): id is string => id !== null) : catalogAvailable && item.taxRate > 0 ? taxes.filter((tax) => tax.type === "VAT" && tax.rate === item.taxRate).slice(0, 1).map((tax) => tax.id) : [],
    packagings: item.packagingId
      ? [{ id: item.packagingId, name: item.packagingName, unitsPerPack: item.unitsPerPack }]
      : [],
    query: item.product.name,
    results: [],
  })),
});
export function PurchaseOrderEditor({ orderId }: { orderId?: string }) {
  const router = useRouter();
  const [access, setAccess] = useState<"loading" | "ready" | "denied">("loading"),
    [loading, setLoading] = useState(Boolean(orderId)),
    [order, setOrder] = useState<PurchaseOrder | null>(null),
    [form, setForm] = useState<Form>(blank),
    [initial, setInitial] = useState<Form>(blank),
    [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]),
    [warehouses, setWarehouses] = useState<Array<{ id: string; name: string }>>([]),
    [context, setContext] = useState<PurchaseOrderSupplierContext | null>(null),
    [contextLoading, setContextLoading] = useState(false),
    [contextError, setContextError] = useState(false),
    [termsTouched, setTermsTouched] = useState(false),
    [dueTouched, setDueTouched] = useState(false),
    [pending, setPending] = useState<"" | "save" | "confirm" | "duplicate" | "delete">(""),
    [error, setError] = useState(""),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [warnings, setWarnings] = useState<Record<string, string>>({}),
    [saved, setSaved] = useState(""),
    [moreOpen, setMoreOpen] = useState(false),
    [dialog, setDialog] = useState<"confirm" | "delete" | "discard" | null>(null),
    [packagingNotice, setPackagingNotice] = useState(false),
    [duplicateSkipped, setDuplicateSkipped] = useState<string[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]), [taxCatalogAvailable, setTaxCatalogAvailable] = useState(false);
  const [supplierDialog, setSupplierDialog] = useState<string | null>(null), [supplierPending, setSupplierPending] = useState(false), [quickProduct, setQuickProduct] = useState<{ index: number; query: string } | null>(null), [focusPacks, setFocusPacks] = useState<{ index: number; token: number } | null>(null);
  const supplierTrigger = useRef<HTMLInputElement | HTMLButtonElement | null>(null), productTrigger = useRef<HTMLInputElement | null>(null);
  const timers = useRef<Record<number, number>>({});
  const dirty = isDirty(initial, form);
  const readOnly = order?.status === "CONFIRMED";
  useEffect(() => {
    const user = getStoredUser();
    setAccess(!process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL || user?.role === "admin" ? "ready" : "denied");
  }, []);
  useEffect(() => {
    if (access !== "ready") return;
    void Promise.all([
      supplierApi.listSuppliers({ status: "ACTIVE", pageSize: 100 }),
      locationApi.listWarehouses(),
      orderId ? purchaseOrderApi.get(orderId) : Promise.resolve(null),
      taxApi.list(true).then((active) => ({ active, available: true })).catch(() => ({ active: [] as Tax[], available: false })),
    ])
      .then(([supplierResult, warehouseResult, loaded, taxResult]) => {
        setSuppliers(supplierResult.items.map(({ id, name }) => ({ id, name })));
        const active = warehouseResult.filter((item) => item.isActive !== false).map(({ id, name }) => ({ id, name }));
        setWarehouses(active);
        const next = loaded ? fromOrder(loaded, taxResult.active, taxResult.available) : { ...blank(), warehouseId: (warehouseResult.find((item) => item.isPrimary && item.isActive !== false && item.status === "ACTIVE") ?? (active.length === 1 ? active[0] : null))?.id ?? "", lines: [{ ...line(), taxIds: taxResult.active.filter((tax) => tax.isDefault).map((tax) => tax.id) }] };
        setTaxes(taxResult.active);
        setTaxCatalogAvailable(taxResult.available);
        setOrder(loaded);
        setForm(next);
        setInitial(next);
        if (loaded) {
          setTermsTouched(true);
          setDueTouched(true);
        }
        try {
          const skipped = window.sessionStorage.getItem(DUPLICATE_SKIPPED_KEY);
          if (skipped) {
            window.sessionStorage.removeItem(DUPLICATE_SKIPPED_KEY);
            setDuplicateSkipped(JSON.parse(skipped) as string[]);
          }
        } catch {
          /* storage is optional */
        }
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "No se pudo preparar el editor."))
      .finally(() => setLoading(false));
  }, [access, orderId]);
  useEffect(() => {
    const listener = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [dirty]);
  const fetchContext = useCallback(
    (id: string) => {
      if (!id) return;
      setContextLoading(true);
      setContextError(false);
      void purchaseOrderApi
        .supplierContext(id)
        .then((value) => {
          setContext(value);
          setForm((current) => {
            const term = !termsTouched
              ? value.paymentTermDays == null
                ? ""
                : String(value.paymentTermDays)
              : current.paymentTermDays;
            return {
              ...current,
              paymentCondition: termsTouched ? current.paymentCondition : value.paymentCondition,
              paymentTermDays: term,
              dueDate: dueTouched ? current.dueDate : term ? addDaysToDate(current.orderDate, Number(term)) : "",
            };
          });
        })
        .catch(() => setContextError(true))
        .finally(() => setContextLoading(false));
    },
    [dueTouched, termsTouched],
  );
  useEffect(() => {
    if (form.supplierId) fetchContext(form.supplierId);
    else setContext(null);
  }, [fetchContext, form.supplierId]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!pending) void save(false);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  });
  const patch = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }));
  const updateLine = (index: number, value: Partial<Line>) =>
    setForm((current) => ({
      ...current,
      lines: current.lines.map((entry, position) => (position === index ? { ...entry, ...value } : entry)),
    }));
  const productSearch = (index: number, query: string) => {
    updateLine(index, { query, product: null, packagingId: "", packagings: [], results: [] });
    window.clearTimeout(timers.current[index]);
    if (!query.trim()) return;
    const captured = query;
    timers.current[index] = window.setTimeout(() => {
      void purchaseOrderApi
        .searchProducts(captured)
        .then((results) =>
          setForm((current) => ({
            ...current,
            lines: current.lines.map((entry, position) =>
              position === index && entry.query === captured ? { ...entry, results } : entry,
            ),
          })),
        );
    }, 300);
  };
  const selectProduct = (index: number, product: NonNullable<Line["product"]>) => {
    updateLine(index, {
      product,
      query: product.name,
      results: [],
      packagingId: "",
      packagingName: "",
      unitsPerPack: "",
      packagings: [],
    });
    if (!form.supplierId) return;
    void purchaseOrderApi
      .listPackagings(product.id, form.supplierId)
      .then((packagings) =>
        updateLine(index, {
          packagings,
          ...(packagings.length === 1
            ? {
                packagingId: packagings[0].id,
                packagingName: packagings[0].name,
                unitsPerPack: String(packagings[0].unitsPerPack),
              }
            : {}),
        }),
      )
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "No se pudieron cargar las presentaciones."),
      );
  };
  const input = (): CreatePurchaseOrderDto => ({
    supplierId: form.supplierId,
    warehouseId: form.warehouseId,
    currency: form.currency,
    orderDate: form.orderDate,
    expectedDate: form.expectedDate || undefined,
    paymentCondition: form.paymentCondition,
    paymentTermDays: form.paymentTermDays ? Number(form.paymentTermDays) : null,
    dueDate: form.dueDate || null,
    freightAmount: Number(form.freightAmount || 0).toFixed(2),
    otherChargesAmount: Number(form.otherChargesAmount || 0).toFixed(2),
    reference: form.reference,
    notes: form.notes,
    items: form.lines.map((entry) => ({
      productId: entry.product?.id ?? "",
      packagingId: entry.packagingId || undefined,
      packagingName: entry.packagingName,
      unitsPerPack: Number(entry.unitsPerPack),
      packageQuantity: Number(entry.packageQuantity),
      costPerPackage: Number(entry.costPerPackage),
      discountAmount: Number(entry.discountAmount),
      ...(taxCatalogAvailable && (entry.taxIds.length > 0 || entry.taxRate === "0") ? { taxIds: entry.taxIds.map(Number) } : { taxRate: Number(entry.taxRate) }),
    })),
  });
  const validate = () => {
    const payload = input();
    const result = validatePurchaseOrderInput(payload) as unknown as Record<string, string>;
    setErrors(result);
    setWarnings(duplicateLineWarnings(payload.items) as Record<string, string>);
    return Object.keys(result).length === 0;
  };
  const save = async (confirm: boolean) => {
    if (!readOnly && !validate()) return;
    setPending(confirm ? "confirm" : "save");
    setError("");
    try {
      const payload = readOnly
        ? { expectedDate: form.expectedDate || undefined, reference: form.reference, notes: form.notes }
        : input();
      const stored = orderId
        ? await purchaseOrderApi.update(orderId, payload)
        : await purchaseOrderApi.create(payload as CreatePurchaseOrderDto);
      setOrder(stored);
      setInitial(fromOrder(stored, taxes, taxCatalogAvailable));
      setForm(fromOrder(stored, taxes, taxCatalogAvailable));
      if (!orderId) router.replace(`/compras/${stored.id}/editar`);
      if (confirm) {
        await purchaseOrderApi.confirm(stored.id);
        router.push(`/compras/${stored.id}`);
      } else
        setSaved(
          `Guardado · ${new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(new Date())}`,
        );
    } catch (cause: unknown) {
      const status =
        typeof cause === "object" && cause && "status" in cause ? Number((cause as { status?: number }).status) : 0;
      setError(
        status === 409
          ? "La orden ya fue confirmada; sólo se pueden editar entrega esperada, referencia y notas."
          : cause instanceof Error
            ? cause.message
            : "No se pudo guardar la orden.",
      );
    } finally {
      setPending("");
    }
  };
  const summary = useMemo(
    () =>
      summarizePurchaseOrder({
        lines: form.lines.map((entry) => ({ ...entry, ...(taxCatalogAvailable ? { taxes: taxes.filter((tax) => entry.taxIds.includes(tax.id)) } : {}) })),
        freightAmount: form.freightAmount,
        otherChargesAmount: form.otherChargesAmount,
      }),
    [form.lines, form.freightAmount, form.otherChargesAmount, taxCatalogAvailable, taxes],
  );
  if (access === "loading" || loading)
    return (
      <section className="workspace">
        <div className="state">
          <strong>Cargando editor…</strong>
        </div>
      </section>
    );
  if (access === "denied")
    return (
      <section className="workspace">
        <div className="state error-state">
          <strong>No autorizado</strong>
        </div>
      </section>
    );
  return (
    <section className="workspace poe-workspace">
      <EditorHeader
        id={orderId}
        number={order?.number}
        status={order?.status ?? "DRAFT"}
        total={summary.total}
        saved={saved}
        pending={pending}
        confirmed={readOnly}
        moreOpen={moreOpen}
        onMore={() => setMoreOpen((value) => !value)}
        onSave={() => void save(false)}
        onConfirm={() => {
          if (validate()) setDialog("confirm");
        }}
        onDuplicate={() => {
          if (!orderId) return;
          setPending("duplicate");
          void purchaseOrderApi
            .duplicate(orderId)
            .then(({ order: copy, skipped }) => {
              try {
                if (skipped.length)
                  window.sessionStorage.setItem(
                    DUPLICATE_SKIPPED_KEY,
                    JSON.stringify(skipped.map((item) => item.productName)),
                  );
              } catch {
                /* storage is optional */
              }
              router.push(`/compras/${copy.id}/editar`);
            })
            .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "No se pudo duplicar."))
            .finally(() => setPending(""));
        }}
        onDelete={() => setDialog("delete")}
        onCancel={() => (dirty ? setDialog("discard") : router.push(orderId ? `/compras/${orderId}` : "/compras"))}
      />
      {error && (
        <Notice kind="error" role="alert">
          {error}
        </Notice>
      )}
      {Object.keys(errors).length > 0 && (
        <Notice kind="error" role="alert">
          {Object.values(errors).join(" ")}
        </Notice>
      )}
      <div className="poe-layout">
        <main className="poe-main">
          <section className="poe-document">
            <header><div><span>Datos comerciales</span><h2>Información de la orden</h2></div><small>Los campos con * son obligatorios</small></header>
            <div className="poe-fields">
            <label>
              Proveedor *
              <div className="poe-supplier-field"><SearchSelect
                ref={(element) => { if (element) supplierTrigger.current = element; }}
                value={form.supplierId}
                options={suppliers}
                disabled={readOnly}
                placeholder="Buscar proveedor"
                onChange={(supplierId) => {
                  const clear = form.lines.some((entry) => entry.packagingId);
                  patch("supplierId", supplierId);
                  patch(
                    "lines",
                    form.lines.map((entry) => ({ ...entry, packagingId: "", packagings: [] })),
                  );
                  setPackagingNotice(clear);
                }}
                onCreate={(query) => setSupplierDialog(query)}
                createLabel={(query) => query ? `Crear proveedor «${query}»` : "Nuevo proveedor"}
              /><button type="button" className="button ghost poe-new-supplier" disabled={readOnly} onClick={(event) => { supplierTrigger.current = event.currentTarget; setSupplierDialog(""); }} aria-label="Nuevo proveedor" title="Nuevo proveedor">＋</button></div>
            </label>
            <label>
              Depósito *
              <select
                disabled={readOnly}
                value={form.warehouseId}
                onChange={(event) => patch("warehouseId", event.target.value)}
              >
                <option value="">Elegí un depósito</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fecha orden
              <input
                disabled={readOnly}
                type="date"
                value={form.orderDate}
                onChange={(event) => {
                  patch("orderDate", event.target.value);
                  if (!dueTouched && form.paymentTermDays)
                    patch("dueDate", addDaysToDate(event.target.value, Number(form.paymentTermDays)));
                }}
              />
            </label>
            <label>
              Entrega esperada
              <input
                type="date"
                value={form.expectedDate}
                onChange={(event) => patch("expectedDate", event.target.value)}
              />
            </label>
            <label>
              Condición pago
              <select
                disabled={readOnly}
                value={form.paymentCondition}
                onChange={(event) => {
                  setTermsTouched(true);
                  patch("paymentCondition", event.target.value as Form["paymentCondition"]);
                }}
              >
                <option value="CASH">Contado</option>
                <option value="CREDIT">Crédito</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="OTHER">Otro</option>
              </select>
            </label>
            <label>
              Plazo (días)
              <input
                disabled={readOnly}
                type="number"
                min="0"
                step="1"
                value={form.paymentTermDays}
                onChange={(event) => {
                  setTermsTouched(true);
                  patch("paymentTermDays", event.target.value);
                  if (!dueTouched)
                    patch("dueDate", event.target.value ? addDaysToDate(form.orderDate, Number(event.target.value)) : "");
                }}
              />
            </label>
            <label>
              Vencimiento
              <input
                disabled={readOnly}
                type="date"
                value={form.dueDate}
                onChange={(event) => {
                  setDueTouched(true);
                  patch("dueDate", event.target.value);
                }}
              />
            </label>
            <label>
              Referencia
              <input value={form.reference} onChange={(event) => patch("reference", event.target.value)} />
            </label>
            <label className="poe-notes">
              Notas
              <textarea
                rows={1}
                value={form.notes}
                onChange={(event) => patch("notes", event.target.value)}
              />
            </label>
            </div>
          </section>
          <SupplierContext
            context={context}
            loading={contextLoading}
            error={contextError}
            onRetry={() => fetchContext(form.supplierId)}
          />
          {duplicateSkipped.length > 0 && (
            <Notice kind="info">
              Orden duplicada. Se omitieron productos inactivos: {duplicateSkipped.join(", ")}.
            </Notice>
          )}
          {packagingNotice && <Notice kind="info">Se limpiaron las presentaciones porque cambió el proveedor.</Notice>}
          <OrderLines
            lines={form.lines}
            errors={errors}
            warnings={warnings}
            readOnly={readOnly}
            taxes={taxes}
            taxCatalogAvailable={taxCatalogAvailable}
            onUpdate={updateLine}
            onSearch={productSearch}
            onSelectProduct={selectProduct}
            onSelectPackaging={(index, packagingId) => {
              const packaging = form.lines[index].packagings.find((entry) => entry.id === packagingId);
              updateLine(index, {
                packagingId,
                packagingName: packaging?.name ?? "",
                unitsPerPack: packaging ? String(packaging.unitsPerPack) : "",
              });
            }}
            onAdd={() => patch("lines", [...form.lines, { ...line(), taxIds: taxes.filter((tax) => tax.isDefault).map((tax) => tax.id) }])}
            onRemove={(index) =>
              patch(
                "lines",
                form.lines.filter((_, current) => current !== index),
              )
            }
            onCreateProduct={(index, query, trigger) => { productTrigger.current = trigger; setQuickProduct({ index, query }); }}
            focusPacks={focusPacks}
          />
        </main>
        <OrderSummary
          summary={summary}
          freight={form.freightAmount}
          other={form.otherChargesAmount}
          onFreight={(value) => patch("freightAmount", value)}
          onOther={(value) => patch("otherChargesAmount", value)}
          readOnly={readOnly}
          lines={form.lines}
          taxes={taxes}
        />
      </div>
      {dialog && (
        <div className="modal-backdrop">
          <section
            className="modal confirm"
            role="dialog"
            aria-modal="true"
            onKeyDown={(event) => {
              if (event.key === "Escape") setDialog(null);
            }}
          >
            <h2>
              {dialog === "confirm"
                ? "Confirmar pedido"
                : dialog === "delete"
                  ? "Eliminar borrador"
                  : "Descartar cambios"}
            </h2>
            <p>
              {dialog === "confirm"
                ? `Confirmar ${order?.number ?? "esta OC"} a ${suppliers.find((item) => item.id === form.supplierId)?.name ?? "proveedor"} por ${money(summary.total)}. El stock no se modifica hasta recibir la mercadería.`
                : dialog === "delete"
                  ? "La orden borrador se eliminará definitivamente."
                  : "Hay cambios sin guardar. ¿Querés descartarlos?"}
            </p>
            <footer>
              <button className="button ghost" autoFocus onClick={() => setDialog(null)}>
                Cancelar
              </button>
              <button
                className={`button ${dialog === "delete" ? "danger" : "primary"}`}
                onClick={() => {
                  if (dialog === "confirm") {
                    setDialog(null);
                    void save(true);
                  } else if (dialog === "delete" && orderId) {
                    setPending("delete");
                    void purchaseOrderApi
                      .delete(orderId)
                      .then(() => router.push("/compras"))
                      .catch((cause: unknown) =>
                        setError(cause instanceof Error ? cause.message : "No se pudo eliminar."),
                      )
                      .finally(() => setPending(""));
                  } else router.push(orderId ? `/compras/${orderId}` : "/compras");
                }}
              >
                {dialog === "confirm" ? "Confirmar pedido" : dialog === "delete" ? "Eliminar borrador" : "Descartar"}
              </button>
            </footer>
          </section>
        </div>
      )}
      {supplierDialog !== null && (
        <SupplierDialog initialName={supplierDialog} pending={supplierPending} onClose={() => { setSupplierDialog(null); window.setTimeout(() => supplierTrigger.current?.focus(), 0); }} onSubmit={(input) => { setSupplierPending(true); setError(""); void supplierApi.createSupplier(input).then((created) => { setSuppliers((current) => [...current, { id: created.id, name: created.name }]); patch("supplierId", created.id); setSupplierDialog(null); window.setTimeout(() => supplierTrigger.current?.focus(), 0); }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "No se pudo crear el proveedor.")).finally(() => setSupplierPending(false)); }}/>
      )}
      {quickProduct && <ProductQuickCreateDialog initialName={quickProduct.query} supplierId={form.supplierId} onClose={() => { setQuickProduct(null); window.setTimeout(() => productTrigger.current?.focus(), 0); }} onCreated={(product, packaging, costPerPackage) => { const index = quickProduct.index; updateLine(index, { product: { id: product.id, name: product.name, slug: product.slug }, query: product.name, results: [], packagingId: packaging?.id ?? "", packagingName: packaging?.name ?? "", unitsPerPack: packaging ? String(packaging.unitsPerPack) : "", costPerPackage: packaging ? (costPerPackage ?? "") : "", packagings: packaging ? [{ id: packaging.id, name: packaging.name, unitsPerPack: packaging.unitsPerPack, isDefault: true, isActive: true, equivalence: `1 ${packaging.name} = ${packaging.unitsPerPack} unidades` }] : [] }); setQuickProduct(null); setFocusPacks({ index, token: Date.now() }); }} />}
    </section>
  );
}
