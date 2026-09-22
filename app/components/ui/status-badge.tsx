type StatusBadgeTone = "success" | "warning" | "danger" | "neutral" | "info";

const toneClassName: Record<StatusBadgeTone, string> = {
  success: "active",
  warning: "inactive",
  danger: "order-cancelled",
  neutral: "inactive",
  info: "inactive",
};

export function StatusBadge({ tone, label }: { tone: "success" | "warning" | "danger" | "neutral" | "info"; label: string }) {
  return <span className={`status ${toneClassName[tone]}`}>{label}</span>;
}
