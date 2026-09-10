/** Items in the order a picker should walk them: by location, then code, then id. */
export function sequenceItems(task) {
  return [...(task.items ?? [])].sort(
    (a, b) =>
      (a.locationSortOrder ?? 0) - (b.locationSortOrder ?? 0) ||
      String(a.locationCode ?? "~").localeCompare(String(b.locationCode ?? "~")) ||
      Number(a.id) - Number(b.id),
  );
}

/** A line is resolved once it is no longer PENDING (picked in full, short or substituted). */
export function isResolved(item) {
  return item.status !== "PENDING";
}

export function pendingLines(task) {
  return sequenceItems(task).filter((item) => !isResolved(item));
}

export function pickingProgress(task) {
  const items = task.items ?? [];
  const total = items.length;
  const resolved = items.filter(isResolved).length;
  return { resolved, total, percent: total === 0 ? 0 : Math.round((resolved / total) * 100) };
}

/** Completion is only allowed for an in-progress task with every line resolved. */
export function canCompleteTask(task) {
  return task.status === "IN_PROGRESS" && pendingLines(task).length === 0 && (task.items ?? []).length > 0;
}

/** Index of the first still-pending item at or after `fromIndex` (wraps). Returns -1 if none. */
export function nextPendingIndex(items, fromIndex) {
  const n = items.length;
  if (n === 0) return -1;
  for (let step = 1; step <= n; step += 1) {
    const index = (fromIndex + step) % n;
    if (!isResolved(items[index])) return index;
  }
  return -1;
}

/** Clamp a quantity entry to the pickable range for an item. */
export function clampPickQuantity(item, quantity) {
  const value = Math.trunc(Number(quantity));
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(value, item.quantityRequired);
}
