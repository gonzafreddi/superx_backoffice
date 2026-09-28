"use client";

import { useId, useState, type ReactNode } from "react";

type MobileFiltersProps = {
  activeCount?: number;
  "aria-label"?: string;
  as?: "div" | "section";
  children: ReactNode;
  className?: string;
  header?: ReactNode;
  search?: ReactNode;
  searchPosition?: "start" | "end";
};

/** Explicit disclosure: search remains visible; secondary controls collapse only on phones. */
export function MobileFilters({ activeCount = 0, "aria-label": ariaLabel, as: Root = "div", children, className = "", header, search, searchPosition = "start" }: MobileFiltersProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return <Root className={`mobile-filters ${className}`.trim()} aria-label={ariaLabel}>
    {header}
    {searchPosition === "start" && search}
    <button type="button" className="mobile-filters-toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}>
      <span>Filtros{activeCount > 0 ? ` (${activeCount})` : ""}</span>
      <span aria-hidden="true">{open ? "−" : "+"}</span>
    </button>
    <div id={panelId} className="mobile-filters-panel" data-open={open ? "true" : "false"}>{children}</div>
    {searchPosition === "end" && search}
  </Root>;
}
