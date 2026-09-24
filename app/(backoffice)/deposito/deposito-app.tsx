"use client";
/* eslint-disable @next/next/no-img-element -- remote product images, same as the rest of the backoffice */
/* eslint-disable react-hooks/set-state-in-effect */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser, logout } from "@/app/lib/auth-api";
import { receivingApi, ReceivingApiError } from "@/app/lib/receiving-api";
import type { ReceivingDetail, ReceivingHeader, ReceivingStatus } from "@/app/lib/receiving-contract";
import {
  isLocationConflict,
  receivingErrorMessage,
  lineDifference,
  matchScannedLine,
  preselectedLocation,
  receivingSummary,
  REJECTION_REASONS,
  validateReceiving,
} from "@/app/lib/receiving-rules.js";
import { stableIdempotencyKey } from "@/app/lib/purchase-order-rules.js";
import styles from "./deposito.module.css";

type LineValue = {
  packageQuantity: string;
  locationId: string;
  reject: boolean;
  rejectedPackageQuantity: string;
  rejectionKind: string;
  rejectionText: string;
  varianceReason: string;
};
type Values = Record<string, LineValue>;
const emptyValue = (): LineValue => ({
  packageQuantity: "",
  locationId: "",
  reject: false,
  rejectedPackageQuantity: "",
  rejectionKind: "",
  rejectionText: "",
  varianceReason: "",
});
// expectedDate is a calendar date stored as UTC midnight: format in UTC or it shows the previous day in Argentina.
const shortDate = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
/** Stock is tracked per warehouse for now; flip to true when locations/racks are rolled out. */
const LOCATIONS_ENABLED = false;
const packs = (count: number) => `${count} ${count === 1 ? "pack" : "packs"}`;
const formatDate = (value: string | null) => (value ? shortDate.format(new Date(value)) : "Sin fecha");

export function DepositoApp({ initialPurchaseOrderId }: { initialPurchaseOrderId?: string }) {
  const router = useRouter();
  const [access, setAccess] = useState<"loading" | "ready" | "auth" | "forbidden">("loading");
  const [view, setView] = useState<"list" | "detail" | "success">(initialPurchaseOrderId ? "detail" : "list");
  const [items, setItems] = useState<ReceivingHeader[]>([]),
    [detail, setDetail] = useState<ReceivingDetail | null>(null);
  const [status, setStatus] = useState<ReceivingStatus>("pending"),
    [query, setQuery] = useState(""),
    [warehouseId, setWarehouseId] = useState("");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const [values, setValues] = useState<Values>({}),
    [locationId, setLocationId] = useState(""),
    [scan, setScan] = useState(""),
    [confirming, setConfirming] = useState(false);
  const [successPending, setSuccessPending] = useState(0),
    [idempotencyKey, setIdempotencyKey] = useState(() => stableIdempotencyKey(""));
  const lineRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const user = getStoredUser();
    if (!process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL) setAccess("ready");
    else if (!user) setAccess("auth");
    else setAccess(user.role === "admin" || user.role === "warehouse" ? "ready" : "forbidden");
    try {
      setWarehouseId(localStorage.getItem("superx.receiving.warehouse") ?? "");
    } catch {}
  }, []);
  const handleError = useCallback((cause: unknown, fallback: string) => {
    if (cause instanceof ReceivingApiError && cause.code === "unauthenticated") return setAccess("auth");
    setError(cause instanceof Error ? receivingErrorMessage(cause.message) : fallback);
  }, []);
  const loadList = useCallback(
    async (quiet = false) => {
      if (access !== "ready") return;
      if (!quiet) setLoading(true);
      try {
        const result = await receivingApi.list({
          status,
          q: query.trim() || undefined,
          warehouseId: warehouseId || undefined,
          pageSize: 100,
        });
        setItems(result.items);
        setError("");
      } catch (cause) {
        handleError(cause, "No pudimos cargar lo que está por recibir.");
      } finally {
        setLoading(false);
      }
    },
    [access, handleError, query, status, warehouseId],
  );
  useEffect(() => {
    if (view !== "list") return;
    const timer = window.setTimeout(() => void loadList(), 250);
    const refresh = window.setInterval(() => void loadList(true), 60000);
    return () => {
      clearTimeout(timer);
      clearInterval(refresh);
    };
  }, [loadList, view]);
  const openDetail = useCallback(
    async (id: string, replaceUrl = true) => {
      setBusy(true);
      setError("");
      try {
        const next = await receivingApi.detail(id);
        setDetail(next);
        setValues(Object.fromEntries(next.lines.map((line) => [line.purchaseOrderItemId, emptyValue()])));
        setLocationId(preselectedLocation(next.lines) || (next.locations.length === 1 ? next.locations[0].id : ""));
        setView("detail");
        if (replaceUrl) router.push(`/deposito/${encodeURIComponent(id)}`);
      } catch (cause) {
        handleError(cause, "No pudimos abrir la recepción.");
        if (initialPurchaseOrderId) setView("list");
      } finally {
        setBusy(false);
        setLoading(false);
      }
    },
    [handleError, initialPurchaseOrderId, router],
  );
  useEffect(() => {
    if (access === "ready" && initialPurchaseOrderId) void openDetail(initialPurchaseOrderId, false);
  }, [access, initialPurchaseOrderId, openDetail]);
  const warehouses = useMemo(
    () => Array.from(new Map(items.map((item) => [item.warehouse.id, item.warehouse])).values()),
    [items],
  );
  const summary = useMemo(
    () =>
      detail
        ? receivingSummary(detail.lines, values)
        : { lineCount: 0, enteredLineCount: 0, packages: 0, differences: [], differenceCount: 0 },
    [detail, values],
  );
  const update = (id: string, patch: Partial<LineValue>) =>
    setValues((current) => ({ ...current, [id]: { ...(current[id] ?? emptyValue()), ...patch } }));
  const setQuantity = (id: string, next: number | string) =>
    update(id, { packageQuantity: next === "" ? "" : String(Math.max(0, Number(next) || 0)) });
  const scanCode = (event: FormEvent) => {
    event.preventDefault();
    if (!detail || !scan.trim()) return;
    const line = matchScannedLine(detail.lines, scan);
    setScan("");
    if (!line) {
      setToast("No encontramos ese código en esta orden.");
      return;
    }
    const current = Number(values[line.purchaseOrderItemId]?.packageQuantity || 0);
    setQuantity(line.purchaseOrderItemId, current + 1);
    lineRefs.current[line.purchaseOrderItemId]?.scrollIntoView({ behavior: "smooth", block: "center" });
    setToast(`${line.product.name}: sumamos 1 pack.`);
  };
  const goBack = () => {
    setDetail(null);
    setConfirming(false);
    setView("list");
    router.push("/deposito");
    void loadList();
  };
  const beginValidation = () => {
    if (!detail) return;
    const checked = validateReceiving(
      detail.lines,
      Object.fromEntries(
        Object.entries(values).map(([id, value]) => [
          id,
          { ...value, rejectionReason: value.rejectionKind === "Otro" ? value.rejectionText : value.rejectionKind },
        ]),
      ),
      locationId,
      LOCATIONS_ENABLED,
    );
    if (!checked.valid) {
      setError(Object.values(checked.errors)[0]);
      const lineId = Object.keys(checked.errors).find((key) => key !== "locationId" && key !== "empty");
      if (lineId) lineRefs.current[lineId]?.scrollIntoView({ behavior: "smooth", block: "center" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setError("");
    setConfirming(true);
  };
  const submit = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      const next = await receivingApi.validate(detail.purchaseOrderId, {
        ...(LOCATIONS_ENABLED && locationId ? { locationId } : {}),
        idempotencyKey,
        // Backend contract: packageQuantity = packs accepted into stock; rejected packs travel separately.
        items: detail.lines.flatMap((line) => {
          const value = values[line.purchaseOrderItemId] ?? emptyValue();
          const diff = lineDifference(line, value);
          if (!diff.accepted && !diff.rejected) return [];
          const rejectionReason = value.rejectionKind === "Otro" ? value.rejectionText.trim() : value.rejectionKind;
          return {
            purchaseOrderItemId: line.purchaseOrderItemId,
            packageQuantity: diff.accepted,
            ...(LOCATIONS_ENABLED && value.locationId ? { locationId: value.locationId } : {}),
            ...(diff.extra ? { allowOverReceipt: true, varianceReason: value.varianceReason.trim() } : {}),
            ...(diff.rejected ? { rejectedPackageQuantity: diff.rejected, rejectionReason } : {}),
          };
        }),
      });
      setSuccessPending(next.pendingPackages);
      setConfirming(false);
      setView("success");
      setIdempotencyKey(stableIdempotencyKey(""));
    } catch (cause) {
      if (cause instanceof ReceivingApiError && cause.status === 409 && isLocationConflict(cause.message)) {
        setConfirming(false);
        setError(receivingErrorMessage(cause.message));
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (cause instanceof ReceivingApiError && cause.status === 409) {
        try {
          const fresh = await receivingApi.detail(detail.purchaseOrderId);
          setDetail(fresh);
          setValues(Object.fromEntries(fresh.lines.map((line) => [line.purchaseOrderItemId, emptyValue()])));
          setLocationId(
            preselectedLocation(fresh.lines) || (fresh.locations.length === 1 ? fresh.locations[0].id : ""),
          );
          setConfirming(false);
          setError(
            "Otra persona registró una recepción mientras controlabas. Actualizamos las cantidades; volvé a verificarlas.",
          );
        } catch {
          handleError(cause, "La orden cambió mientras la controlabas.");
        }
      } else handleError(cause, "No pudimos validar la recepción.");
    } finally {
      setBusy(false);
    }
  };

  if (access === "loading")
    return (
      <main className={styles.shell}>
        <div className={styles.state}>Verificando acceso…</div>
      </main>
    );
  if (access === "auth")
    return (
      <main className={styles.shell}>
        <div className={styles.state}>
          <h1>Iniciá sesión</h1>
          <p>Entrá con tu cuenta de Depósito para controlar mercadería.</p>
          <Link className={styles.primary} href="/login?next=/deposito">
            Ingresar
          </Link>
        </div>
      </main>
    );
  if (access === "forbidden")
    return (
      <main className={styles.shell}>
        <div className={styles.state}>
          <h1>No tenés acceso a Depósito</h1>
          <p>Pedile a una persona administradora que revise tu rol.</p>
          <button
            className={styles.secondary}
            onClick={() => {
              logout();
              router.replace("/login");
            }}
          >
            Cambiar de cuenta
          </button>
        </div>
      </main>
    );
  if (view === "success")
    return (
      <main className={styles.shell}>
        <div className={styles.success}>
          <span aria-hidden="true">✓</span>
          <p className={styles.eyebrow}>CONTROL FINALIZADO</p>
          <h1>Recepción registrada</h1>
          <p>
            {successPending
              ? successPending === 1
                ? "Queda 1 pack pendiente."
                : `Quedan ${successPending} packs pendientes.`
              : "La orden quedó recibida por completo."}
          </p>
          <button
            className={styles.primary}
            onClick={() => {
              if (initialPurchaseOrderId) {
                router.replace("/deposito");
                return;
              }
              setView("list");
              void loadList();
            }}
          >
            Volver a Por recibir
          </button>
        </div>
      </main>
    );
  if (view === "detail" && detail)
    return (
      <main className={`${styles.shell} ${styles.detailShell}`}>
        <header className={styles.detailHeader}>
          <button className={styles.back} aria-label="Volver a Por recibir" onClick={goBack}>
            ←
          </button>
          <div>
            <p className={styles.eyebrow}>{detail.number ?? "ORDEN DE COMPRA"}</p>
            <h1>{detail.supplier.name}</h1>
            <p>
              {detail.warehouse.name} · Esperada {formatDate(detail.expectedDate)}
            </p>
          </div>
        </header>
        {toast && (
          <div className={styles.toast} role="status">
            <span>{toast}</span>
            <button aria-label="Cerrar aviso" onClick={() => setToast("")}>
              ×
            </button>
          </div>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <section className={styles.controlPanel}>
          <form onSubmit={scanCode}>
            <label htmlFor="receiving-scan">Escaneá o escribí un código</label>
            <div>
              <input
                id="receiving-scan"
                value={scan}
                onChange={(event) => setScan(event.target.value)}
                placeholder="EAN o código de presentación"
                inputMode="numeric"
                autoComplete="off"
              />
              <button>Buscar</button>
            </div>
          </form>
          {LOCATIONS_ENABLED && (<label>
            Ubicación general
            <select value={locationId} onChange={(event) => setLocationId(event.target.value)}>
              <option value="">Seleccionar ubicación</option>
              {detail.locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.code}
                </option>
              ))}
            </select>
          </label>)}
          <button
            className={styles.fillAll}
            onClick={() =>
              setValues(
                Object.fromEntries(
                  detail.lines.map((line) => [
                    line.purchaseOrderItemId,
                    {
                      ...(values[line.purchaseOrderItemId] ?? emptyValue()),
                      packageQuantity: String(line.pendingPackages),
                    },
                  ]),
                ),
              )
            }
          >
            Completar todo con lo pendiente
          </button>
        </section>
        <section className={styles.lines}>
          {detail.lines.map((line) => {
            const value = values[line.purchaseOrderItemId] ?? emptyValue();
            const diff = lineDifference(line, value);
            return (
              <article
                key={line.purchaseOrderItemId}
                ref={(node) => {
                  lineRefs.current[line.purchaseOrderItemId] = node;
                }}
                className={`${styles.lineCard} ${diff.hasDifference ? styles.different : ""}`}
              >
                <header>
                  {line.product.imageUrl ? (
                    <img src={line.product.imageUrl} alt="" />
                  ) : (
                    <span className={styles.imagePlaceholder} aria-hidden="true">
                      □
                    </span>
                  )}
                  <div>
                    <h2>{line.product.name}</h2>
                    <p>
                      {line.packagingName} · {line.unitsPerPack} unidades por pack
                    </p>
                    <small>
                      {[line.packagingBarcode, ...line.product.barcodes].filter(Boolean).join(" · ") ||
                        "Sin EAN informado"}
                    </small>
                  </div>
                </header>
                <dl>
                  <div>
                    <dt>Pedido</dt>
                    <dd>
                      {packs(line.orderedPackages)}
                      <small>{line.orderedUnits} u.</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Ya recibido</dt>
                    <dd>
                      {packs(line.receivedPackages)}
                      <small>{line.receivedUnits} u.</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Pendiente</dt>
                    <dd>
                      {packs(line.pendingPackages)}
                      <small>{line.pendingUnits} u.</small>
                    </dd>
                  </div>
                </dl>
                <div className={styles.quantityHead}>
                  <label htmlFor={`qty-${line.purchaseOrderItemId}`}>Recibido ahora</label>
                  <button onClick={() => setQuantity(line.purchaseOrderItemId, line.pendingPackages)}>Todo OK</button>
                </div>
                <div className={styles.stepper}>
                  <button
                    aria-label={`Restar un pack de ${line.product.name}`}
                    onClick={() =>
                      setQuantity(line.purchaseOrderItemId, Math.max(0, Number(value.packageQuantity || 0) - 1))
                    }
                  >
                    −
                  </button>
                  <input
                    id={`qty-${line.purchaseOrderItemId}`}
                    type="number"
                    min="0"
                    step="1"
                    value={value.packageQuantity}
                    onChange={(event) => setQuantity(line.purchaseOrderItemId, event.target.value)}
                    placeholder="—"
                    aria-describedby={`units-${line.purchaseOrderItemId}`}
                  />
                  <button
                    aria-label={`Sumar un pack de ${line.product.name}`}
                    onClick={() => setQuantity(line.purchaseOrderItemId, Number(value.packageQuantity || 0) + 1)}
                  >
                    ＋
                  </button>
                </div>
                <p id={`units-${line.purchaseOrderItemId}`} className={styles.units}>
                  {diff.received * line.unitsPerPack} unidades ingresadas
                </p>
                {diff.extra > 0 && (
                  <label className={styles.warning}>
                    Hay {packs(diff.extra)} de más. Motivo obligatorio
                    <input
                      value={value.varianceReason}
                      onChange={(event) => update(line.purchaseOrderItemId, { varianceReason: event.target.value })}
                      placeholder="Ej.: remanente autorizado por proveedor"
                    />
                  </label>
                )}
                {LOCATIONS_ENABLED && (<details className={styles.advanced}>
                  <summary>Cambiar ubicación para esta línea</summary>
                  <select
                    aria-label={`Ubicación de ${line.product.name}`}
                    value={value.locationId}
                    onChange={(event) => update(line.purchaseOrderItemId, { locationId: event.target.value })}
                  >
                    <option value="">Usar ubicación general</option>
                    {detail.locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.code}
                      </option>
                    ))}
                  </select>
                </details>)}
                <label className={styles.rejectToggle}>
                  <input
                    type="checkbox"
                    checked={value.reject}
                    onChange={(event) =>
                      update(line.purchaseOrderItemId, {
                        reject: event.target.checked,
                        rejectedPackageQuantity: event.target.checked ? value.rejectedPackageQuantity : "",
                        rejectionKind: event.target.checked ? value.rejectionKind : "",
                        rejectionText: event.target.checked ? value.rejectionText : "",
                      })
                    }
                  />
                  <span>Rechazar packs</span>
                </label>
                {value.reject && (
                  <div className={styles.rejectPanel}>
                    <label>
                      Packs rechazados
                      <input
                        type="number"
                        min="0"
                        max={value.packageQuantity || undefined}
                        value={value.rejectedPackageQuantity}
                        onChange={(event) =>
                          update(line.purchaseOrderItemId, { rejectedPackageQuantity: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      Motivo
                      <select
                        value={value.rejectionKind}
                        onChange={(event) => update(line.purchaseOrderItemId, { rejectionKind: event.target.value })}
                      >
                        <option value="">Seleccionar</option>
                        {REJECTION_REASONS.map((reason) => (
                          <option key={reason}>{reason}</option>
                        ))}
                      </select>
                    </label>
                    {value.rejectionKind === "Otro" && (
                      <label>
                        Detalle
                        <input
                          value={value.rejectionText}
                          onChange={(event) => update(line.purchaseOrderItemId, { rejectionText: event.target.value })}
                          placeholder="Contanos qué pasó"
                        />
                      </label>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </section>
        <div className={styles.bottomSpacer} />
        <footer className={styles.sticky}>
          <div>
            <strong>{packs(summary.packages)}</strong>
            <span>
              {summary.enteredLineCount}/{summary.lineCount} líneas · diferencias: {summary.differenceCount}
            </span>
          </div>
          <button disabled={busy} onClick={beginValidation}>
            Validar recepción
          </button>
        </footer>
        {confirming && (
          <div className={styles.sheetBackdrop} onMouseDown={() => setConfirming(false)}>
            <section
              className={styles.sheet}
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <header>
                <div>
                  <p className={styles.eyebrow}>CONFIRMACIÓN</p>
                  <h2 id="confirm-title">Revisá las diferencias</h2>
                </div>
                <button aria-label="Cerrar" onClick={() => setConfirming(false)}>
                  ×
                </button>
              </header>
              {summary.differences.length ? (
                <ul>
                  {summary.differences.map((item) => (
                    <li key={item.line.purchaseOrderItemId}>
                      <strong>{item.line.product.name}</strong>
                      <span>
                        {[
                          item.missing ? `Faltan ${item.missing}` : "",
                          item.extra ? `Sobran ${item.extra}` : "",
                          item.rejected ? `Rechazados ${item.rejected}` : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}{" "}
                        packs
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.allGood}>Las cantidades coinciden con todo lo pendiente.</p>
              )}
              <p className={styles.sheetNote}>Las líneas sin cantidad se registran como 0.</p>
              <button className={styles.primary} disabled={busy} onClick={() => void submit()}>
                {busy ? "Registrando…" : "Confirmar recepción"}
              </button>
              <button className={styles.secondary} disabled={busy} onClick={() => setConfirming(false)}>
                Seguir revisando
              </button>
            </section>
          </div>
        )}
      </main>
    );
  return (
    <main className={styles.shell}>
      <header className={styles.listHeader}>
        <div>
          <p className={styles.eyebrow}>SUPERX · DEPÓSITO</p>
          <h1>Por recibir</h1>
          <p>Controlá la mercadería antes de ingresarla al stock.</p>
        </div>
        <button className={styles.refresh} disabled={loading} onClick={() => void loadList()}>
          ↻ Actualizar
        </button>
      </header>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.filters}>
        <div className={styles.tabs} role="group" aria-label="Estado de recepción">
          {(
            [
              ["pending", "Pendientes"],
              ["partial", "Parciales"],
              ["all", "Todas"],
            ] as const
          ).map(([value, label]) => (
            <button key={value} aria-pressed={status === value} onClick={() => setStatus(value)}>
              {label}
            </button>
          ))}
        </div>
        <label className={styles.search}>
          <span className="sr-only">Buscar por orden o proveedor</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar OC o proveedor"
          />
        </label>
        {warehouses.length > 1 && (
          <label className={styles.warehouseSelect}>
            Depósito
            <select
              value={warehouseId}
              onChange={(event) => {
                setWarehouseId(event.target.value);
                try {
                  localStorage.setItem("superx.receiving.warehouse", event.target.value);
                } catch {}
              }}
            >
              <option value="">Todos</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {loading ? (
        <div className={styles.state} role="status">
          Cargando recepciones…
        </div>
      ) : items.length ? (
        <ul className={styles.receiveList}>
          {items.map((item) => (
            <li key={item.purchaseOrderId}>
              <button disabled={busy} onClick={() => void openDetail(item.purchaseOrderId)}>
                <div className={styles.cardTop}>
                  <div>
                    <span className={styles.orderNumber}>{item.number ?? "OC"}</span>
                    <h2>{item.supplier.name}</h2>
                  </div>
                  <span className={item.receiptStatus === "PARTIALLY_RECEIVED" ? styles.partial : styles.pending}>
                    {item.receiptStatus === "PARTIALLY_RECEIVED" ? "Parcial" : "Pendiente"}
                  </span>
                </div>
                <p>{item.warehouse.name}</p>
                <div className={styles.cardMeta}>
                  <span className={item.isLate ? styles.late : ""}>
                    {item.isLate ? "Atrasada · " : ""}
                    {formatDate(item.expectedDate)}
                  </span>
                  <span>
                    {item.lineCount} {item.lineCount === 1 ? "línea" : "líneas"}
                  </span>
                </div>
                <strong className={styles.pendingQty}>
                  {packs(item.pendingPackages)} <small>· {item.pendingUnits} unidades pendientes</small>
                </strong>
                <span className={styles.open}>
                  Controlar <b aria-hidden="true">→</b>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.state}>
          <h2>No hay mercadería en esta vista</h2>
          <p>Probá otro estado, depósito o búsqueda.</p>
        </div>
      )}
    </main>
  );
}
