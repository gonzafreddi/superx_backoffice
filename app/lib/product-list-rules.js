export function stockLevel(stock, lowThreshold = 10) {
  if (stock === undefined || stock === null || !Number.isFinite(Number(stock))) return "unknown";
  if (Number(stock) <= 0) return "out";
  if (Number(stock) <= lowThreshold) return "low";
  return "ok";
}

export function relativeProductDate(value, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const days = Math.round((date.getTime() - now.getTime()) / 86400000);
  if (days === 0) return "Hoy";
  if (days === -1) return "Ayer";
  if (days > -7 && days < 0) return `Hace ${Math.abs(days)} días`;
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: date.getFullYear() === now.getFullYear() ? undefined : "numeric" }).format(date);
}
