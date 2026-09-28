"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { listCustomers, type Customer, type CustomerSort } from "@/app/lib/customers-api";
import { money } from "../orders/order-shared";
import { Notice } from "../ui/notice";

const PAGE_SIZE = 50;
const sorts: Array<[CustomerSort, string]> = [["recent", "Registro más reciente"], ["lastOrder", "Último pedido"], ["orders", "Más pedidos"], ["spent", "Más gasto"]];
export const customerDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

export function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]), [total, setTotal] = useState(0), [page, setPage] = useState(1), [query, setQuery] = useState(""), [sort, setSort] = useState<CustomerSort>("recent"), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); try { const result = await listCustomers({ q: query.trim() || undefined, sort, page, pageSize: PAGE_SIZE }); setCustomers(result.items); setTotal(result.total); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos cargar los clientes."); } finally { setLoading(false); } }, [query, sort, page]);
  useEffect(() => { const timer = setTimeout(() => void load(), 250); return () => clearTimeout(timer); }, [load]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return <section className="workspace"><header className="topbar"><div><p className="eyebrow">CLIENTES</p><h1>Clientes registrados</h1><p className="subtitle">Personas que crearon su cuenta en la tienda, con sus pedidos y gasto acumulado.</p></div></header>{error && <Notice kind="error" role="alert" onDismiss={() => setError("")}>{error}</Notice>}
    <section className="locations-filter-bar"><label className="search"><span className="sr-only">Buscar clientes</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar por nombre, email o teléfono" /></label><label className="field"><span>Ordenar por</span><select value={sort} onChange={(event) => { setSort(event.target.value as CustomerSort); setPage(1); }}>{sorts.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></section>
    <section className="location-table-panel"><header><div><p className="eyebrow">CUENTAS</p><h2>{total} {total === 1 ? "cliente" : "clientes"}</h2></div></header>{loading ? <div className="state">Cargando clientes…</div> : customers.length === 0 ? <div className="state">{query.trim() ? "Ningún cliente coincide con la búsqueda." : "Todavía no hay clientes registrados."}</div> : <div className="location-table-wrap"><table className="location-stock-table"><thead><tr><th>Cliente</th><th>Teléfono</th><th>Localidad</th><th>Alta</th><th>Pedidos</th><th>Gastado</th><th>Último pedido</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id}><td data-label="Cliente"><Link href={`/clientes/${customer.id}`}><strong>{customer.name || customer.email}</strong></Link>{customer.name && <small>{customer.email}</small>}</td><td data-label="Teléfono">{customer.phone || "—"}</td><td data-label="Localidad">{customer.city || "—"}</td><td data-label="Alta">{customerDate.format(new Date(customer.createdAt))}</td><td data-label="Pedidos">{customer.ordersCount}</td><td data-label="Gastado">{money.format(Number(customer.totalSpent))}</td><td data-label="Último pedido">{customer.lastOrderAt ? customerDate.format(new Date(customer.lastOrderAt)) : "Sin pedidos"}</td></tr>)}</tbody></table></div>}
      {pages > 1 && <footer className="location-pagination"><span>Página {page} de {pages}</span><div><button className="button ghost" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Anterior</button><button className="button ghost" disabled={page >= pages || loading} onClick={() => setPage(page + 1)}>Siguiente</button></div></footer>}
    </section></section>;
}
