import clsx from "clsx";
import type { ReactNode } from "react";
import type { IncidentStatus, Priority } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/constants";

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" style={{ display: "grid", placeItems: "center", minHeight: 220, gap: 12 }}>
      <div className="skeleton" style={{ width: 48, height: 48, borderRadius: "50%" }} />
      <span className="muted">{label}…</span>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p className="muted" style={{ maxWidth: 720, margin: "0.6rem 0 0" }}>{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={clsx("badge", `badge-${priority}`)}>{priority.toUpperCase()}</span>;
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return <span className={clsx("badge", `badge-${status}`)}>{STATUS_LABELS[status]}</span>;
}

export function EmptyState({ icon, title, description, action }: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-flat" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
      <div style={{ color: "var(--primary)", display: "grid", placeItems: "center" }}>{icon}</div>
      <h2 style={{ margin: "1rem 0 0.4rem" }}>{title}</h2>
      <p className="muted" style={{ maxWidth: 520, margin: "0 auto 1.25rem" }}>{description}</p>
      {action}
    </div>
  );
}
