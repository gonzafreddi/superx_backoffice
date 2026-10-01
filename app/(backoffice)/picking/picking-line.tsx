"use client";

import { useEffect, useState } from "react";
import type { PickingApi, PickingItem } from "@/app/lib/picking-contract";
import { Icon, Spinner, Status } from "./picking-ui";
import styles from "./picking.module.css";

type Resolution = Parameters<PickingApi["reportShortage"]>[2];
export type Incident = { quantity: number; resolution: Resolution; substituteId?: string; note: string };
export function Stepper({ value, max, onChange, disabled, label }: { value: number; max: number; onChange: (value: number) => void; disabled: boolean; label: string }) {
  return <div className={styles.quantity}><span>{label}</span><div className={styles.stepper}><button type="button" aria-label={`Restar una unidad · ${label}`} disabled={disabled || value <= 0} onClick={() => onChange(value - 1)}>−</button><output aria-label={label}>{value}</output><button type="button" aria-label={`Sumar una unidad · ${label}`} disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>+</button></div></div>;
}
export function PickingLine({ item, disabled, saving, highlighted, error, onPick, onShortage, searchProducts }: {
  item: PickingItem; disabled: boolean; saving: boolean; highlighted: boolean; error?: string;
  onPick: (quantity: number, barcode?: string) => Promise<boolean>;
  onShortage: (incident: Incident) => Promise<boolean>;
  searchProducts: PickingApi["searchProducts"];
}) {
  const [quantity, setQuantity] = useState(item.quantityPicked || item.quantityRequired);
  const [lastPicked, setLastPicked] = useState(item.quantityPicked);
  if (lastPicked !== item.quantityPicked) { setLastPicked(item.quantityPicked); setQuantity(item.quantityPicked); }
  const [editing, setEditing] = useState(false), [incident, setIncident] = useState(false);
  const [available, setAvailable] = useState(Math.min(item.quantityPicked, item.quantityRequired - 1));
  const [reason, setReason] = useState("Sin stock"), [note, setNote] = useState("");
  const [resolution, setResolution] = useState<Resolution>("CONTACT_ME");
  const [query, setQuery] = useState(""), [results, setResults] = useState<Array<{ id: string; name: string }>>([]);
  const [substitute, setSubstitute] = useState<{ id: string; name: string } | null>(null);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [barcode, setBarcode] = useState(""), [imageFailed, setImageFailed] = useState(false);
  const resolved = item.status !== "PENDING";
  useEffect(() => {
    if (resolution !== "REPLACE_SIMILAR" || !query.trim() || substitute) return;
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      setSearchState("loading");
      void searchProducts(query.trim()).then((products) => { if (!cancelled) { setResults(products); setSearchState("ready"); } }).catch(() => { if (!cancelled) setSearchState("error"); });
    }, 300);
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, [query, resolution, substitute, searchProducts]);
  const confirm = async (code?: string) => { if (await onPick(quantity, code)) { setEditing(false); setBarcode(""); } };
  return <article id={`line-${item.id}`} className={`${styles.line} ${resolved && !editing ? styles.resolved : ""} ${highlighted ? styles.highlighted : ""}`} aria-label={item.productName} aria-busy={saving}>
    <div className={styles.productHead}><div className={styles.productImage}>{item.productImageUrl && !imageFailed ?
      // Remote catalog images can come from arbitrary hosts; reserve space and fall back on failure.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.productImageUrl} alt="" width={64} height={64} loading="lazy" onError={() => setImageFailed(true)} /> : <Icon name="boxes" />}</div>
      <div className={styles.productInfo}><h2>{item.productName}</h2><p>{[item.brandName, item.unitName || item.unitCode].filter(Boolean).join(" · ")}</p>{(item.barcodes?.[0] || item.barcode) && <p className={styles.code}>Código: {item.barcodes?.[0] || item.barcode}</p>}{item.locationCode && <span className={styles.location}>Ubicación: {item.locationCode}</span>}</div><Status status={item.status === "PENDING" ? "LINE_PENDING" : item.status} />
    </div>
    {resolved && !editing ? <div className={styles.resolvedSummary}><span>{item.quantityPicked} / {item.quantityRequired} unidades{item.substituteProductName ? ` · Sustituto: ${item.substituteProductName}` : ""}</span>{item.status === "PICKED" && <button className={styles.secondary} disabled={disabled} onClick={() => { setQuantity(item.quantityPicked); setEditing(true); }}>Editar</button>}</div> :
      <><div className={styles.lineControls}><p>Necesitás <strong>{item.quantityRequired} unidades</strong></p><Stepper label="Preparado" value={quantity} max={item.quantityRequired} onChange={setQuantity} disabled={disabled || incident} /><button className={styles.primary} disabled={disabled || incident} onClick={() => void confirm()}>{saving ? <><Spinner />Guardando…</> : <><Icon name="check" />Confirmar</>}</button>{editing && <button className={styles.secondary} disabled={disabled} onClick={() => setEditing(false)}>Cancelar edición</button>}</div>
      {!item.barcodes?.length && !incident && <form className={styles.legacyScan} onSubmit={(event) => { event.preventDefault(); if (barcode.trim()) void confirm(barcode.trim()); }}><label htmlFor={`barcode-${item.id}`}>Escanear código de esta línea</label><input id={`barcode-${item.id}`} value={barcode} disabled={disabled} onChange={(event) => setBarcode(event.target.value)} /><button className={styles.secondary} disabled={disabled || !barcode.trim()}>Confirmar código</button></form>}
      {!incident && item.status === "PENDING" && <button className={styles.shortageTrigger} disabled={disabled} onClick={() => { setAvailable(Math.min(item.quantityPicked, item.quantityRequired - 1)); setIncident(true); }}>Reportar faltante</button>}
      {incident && <section className={styles.shortagePanel} aria-label="Producto faltante"><h3>Producto faltante</h3><p>Cantidad requerida: {item.quantityRequired}</p><Stepper label="Cantidad disponible" value={available} max={item.quantityRequired - 1} onChange={setAvailable} disabled={disabled} />
        <fieldset disabled={disabled}><legend>Motivo</legend><div className={styles.choices}>{["Sin stock", "Producto dañado", "No encontrado", "Otro"].map((value) => <label key={value}><input type="radio" name={`reason-${item.id}`} checked={reason === value} onChange={() => setReason(value)} />{value}</label>)}</div></fieldset>
        <label className={styles.field}>Detalle opcional<input maxLength={240} value={note} disabled={disabled} onChange={(event) => setNote(event.target.value)} placeholder="Agregá un detalle" /></label>
        <fieldset disabled={disabled}><legend>Resolución</legend><div className={styles.choices}>{([["REPLACE_SIMILAR", "Reemplazar por similar"], ["CONTACT_ME", "Contactar al cliente"], ["REMOVE_ITEM", "Quitar producto"]] as const).map(([value, label]) => <label key={value}><input type="radio" name={`resolution-${item.id}`} checked={resolution === value} onChange={() => setResolution(value)} />{label}</label>)}</div></fieldset>
        {resolution === "REPLACE_SIMILAR" && <div className={styles.search}><label className={styles.field}>Buscar producto sustituto<input type="search" disabled={disabled} value={query} onChange={(event) => { setQuery(event.target.value); setSubstitute(null); setResults([]); setSearchState("idle"); }} placeholder="Nombre, código o código de barras" /></label>{substitute ? <p>Seleccionado: <strong>{substitute.name}</strong></p> : query.trim() && <div aria-live="polite">{searchState === "loading" && <p>Buscando…</p>}{searchState === "error" && <p role="alert">No pudimos buscar productos. Modificá la búsqueda para reintentar.</p>}{searchState === "ready" && !results.length && <p>No encontramos productos.</p>}{results.map((product) => <button className={styles.searchResult} key={product.id} disabled={disabled} onClick={() => { setSubstitute(product); setResults([]); }}>{product.name}</button>)}</div>}</div>}
        <div className={styles.actions}><button className={styles.secondary} disabled={disabled} onClick={() => setIncident(false)}>Cancelar</button><button className={styles.primary} disabled={disabled || (resolution === "REPLACE_SIMILAR" && !substitute)} onClick={async () => { if (await onShortage({ quantity: available, resolution, substituteId: resolution === "REPLACE_SIMILAR" ? substitute?.id : undefined, note: `${reason}: ${note.trim()}`.trim() })) setIncident(false); }}>{saving ? <><Spinner />Guardando…</> : "Confirmar incidencia"}</button></div>
      </section>}</>}
    {error && <p className={styles.error} role="alert">{error}</p>}
  </article>;
}
