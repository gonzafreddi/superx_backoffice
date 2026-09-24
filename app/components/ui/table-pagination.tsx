import type { ReactNode } from "react";

type TablePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  label?: ReactNode;
  onPrev: () => void;
  onNext: () => void;
  buttonClassName: string;
  loading?: boolean;
  buttonType?: "button" | "submit" | "reset";
};

export function TablePagination({ page, pageSize, total, label, onPrev, onNext, buttonClassName, loading = false, buttonType }: TablePaginationProps) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return <footer className="product-pagination"><span>{label}</span><div><button className={buttonClassName} type={buttonType} disabled={page <= 1 || loading} onClick={onPrev}>Anterior</button><button className={buttonClassName} type={buttonType} disabled={page >= lastPage || loading} onClick={onNext}>Siguiente</button></div></footer>;
}
