"use client";
/* eslint-disable jsx-a11y/role-has-required-aria-props, react-hooks/set-state-in-effect */

import { forwardRef, useEffect, useId, useRef, useState } from "react";

type SearchSelectProps<T extends { id: string; name: string }> = {
  value: string;
  options: T[];
  onChange: (value: string) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onCreate?: (query: string) => void;
  createLabel?: (query: string) => string;
};

function SearchSelectInner<T extends { id: string; name: string }>({ value, options, onChange, onSearch, placeholder = "Buscar…", disabled = false, onCreate, createLabel }: SearchSelectProps<T>, forwardedRef: React.ForwardedRef<HTMLInputElement>) {
  const [query, setQuery] = useState(options.find((option) => option.id === value)?.name ?? "");
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const timer = useRef<number | null>(null);
  const selectedName = options.find((option) => option.id === value)?.name ?? "";
  useEffect(() => { setQuery(selectedName); }, [selectedName]);
  const optionId = (index: number) => `${listId}-option-${index}`;
  const needle = typed ? query.trim().toLocaleLowerCase("es-AR") : "";
  const visible = options.filter((option) => option.name.toLocaleLowerCase("es-AR").includes(needle));
  const exactMatch = options.some((option) => option.name.trim().toLocaleLowerCase("es-AR") === query.trim().toLocaleLowerCase("es-AR"));
  const search = (next: string) => {
    setQuery(next);
    setTyped(true);
    setOpen(true);
    setActive(0);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onSearch?.(next), 250);
  };
  return (
    <div className="poe-search-select">
      <input
        ref={forwardedRef}
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        aria-activedescendant={open && visible[active] ? optionId(active) : undefined}
        disabled={disabled}
        value={query}
        placeholder={placeholder}
        onChange={(event) => search(event.target.value)}
        onClick={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setTyped(false);
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
            setQuery(visible[active].name); setTyped(false);
            setOpen(false);
          }
          if (event.key === "Enter" && !visible[active] && onCreate) {
            event.preventDefault();
            setOpen(false);
            onCreate(query.trim());
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
                  setQuery(option.name); setTyped(false);
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
          {onCreate && !(typed && exactMatch) && <li role="option" className="poe-create-option" onMouseDown={(event) => { event.preventDefault(); setOpen(false); onCreate(typed ? query.trim() : ""); }}>＋ {createLabel?.(typed ? query.trim() : "") ?? "Crear nuevo"}</li>}
        </ul>
      )}
    </div>
  );
}

export const SearchSelect = forwardRef(SearchSelectInner) as <T extends { id: string; name: string }>(props: SearchSelectProps<T> & { ref?: React.ForwardedRef<HTMLInputElement> }) => React.ReactElement;
