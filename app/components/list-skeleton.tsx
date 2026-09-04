export function ListSkeleton({ label }: { label: string }) {
  return <div className="state" role="status" aria-label={label}>
    <div className="skeleton-list" aria-hidden="true"><span className="skeleton-row" /><span className="skeleton-row" /><span className="skeleton-row" /><span className="skeleton-row" /></div>
    <span>{label}</span>
  </div>;
}
