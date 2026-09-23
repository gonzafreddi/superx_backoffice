"use client";
/* eslint-disable jsx-a11y/role-has-required-aria-props */

import { useId, useRef, useState } from "react";

export function SearchSelect<T extends { id: string; name: string }>({
  value,
  options,
  onChange,
  onSearch,
  placeholder = "Buscar…",
  disabled = false,
}: {
  value: string;
  options: T[];
  onChange: (value: string) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState(options.find((option) => option.id === value)?.name ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const timer = useRef<number | null>(null);
  const selectedName = options.find((option) => option.id === value)?.name ?? "";
  const optionId = (index: number) => `${listId}-option-${index}`;
  const visible = options.filter((option) =>
    option.name.toLocaleLowerCase("es-AR").includes(query.toLocaleLowerCase("es-AR")),
  );
  const search = (next: string) => {
    setQuery(next);
    setOpen(true);
    setActive(0);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onSearch?.(next), 250);
  };
  return (
    <div className="poe-search-select">
      <input
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        aria-activedescendant={open && visible[active] ? optionId(active) : undefined}
        disabled={disabled}
        value={query}
        placeholder={placeholder}
        onChange={(event) => search(event.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setQuery(selectedName);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActive((current) => Math.min(current + 1, Math.max(visible.length - 1, 0)));
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((current) => Math.max(current - 1, 0));
          }
          if (event.key === "Enter" && visible[active]) {
            event.preventDefault();
            onChange(visible[active].id);
            setQuery(visible[active].name);
            setOpen(false);
          }
          if (event.key === "Escape") {
            setOpen(false);
            setQuery(selectedName);
          }
        }}
      />
      {open && (
        <ul id={listId} role="listbox">
          {visible.length ? (
            visible.map((option, index) => (
              <li
                key={option.id}
                id={optionId(index)}
                role="option"
                aria-selected={option.id === value}
                className={index === active ? "active" : ""}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onChange(option.id);
                  setQuery(option.name);
                  setOpen(false);
                }}
              >
                {option.name}
              </li>
            ))
          ) : (
            <li role="option" aria-disabled="true">
              Sin resultados
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
