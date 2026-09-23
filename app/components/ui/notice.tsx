"use client";

import type { ReactNode } from "react";

type NoticeProps = {
  kind: "success" | "error" | "info";
  role?: "status" | "alert";
  label?: ReactNode;
  children: ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  dismissButtonType?: "button" | "submit" | "reset";
  closeContent?: ReactNode;
};

export function Notice({ kind, role = "status", label, children, onDismiss, dismissLabel, dismissButtonType, closeContent }: NoticeProps) {
  return <div className={`notice ${kind}`} role={role}>{label && <span>{label}</span>}{children}{onDismiss && <button type={dismissButtonType} aria-label={dismissLabel} onClick={onDismiss}>{closeContent ?? "×"}</button>}</div>;
}
