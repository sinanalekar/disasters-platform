"use client";

import Link from "next/link";
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ClipboardCheck, Clock3, Filter, MapPinned, Radio, UserCheck } from "lucide-react";
import { AppShell, ProtectedPage } from "@/components/app-shell";
import { EmptyState, PageHeader, PriorityBadge, Spinner, StatusBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { STATUS_LABELS } from "@/lib/constants";
import { db } from "@/lib/firebase";
import type { Incident, IncidentStatus } from "@/lib/types";

function Operations() {
  const { user, profile } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"all" | IncidentStatus>("all");
  const [priority, setPriority] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => onSnapshot(query(collection(db, "incidents"), orderBy("createdAt", "desc")), (snapshot) => {
    setIncidents(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Incident)));
    setLoading(false);
  }, () => setLoading(false)), []);

  const filtered = useMemo(() => incidents.filter((incident) =>
    (status === "all" || incident.status === status) &&
    (priority === "all" || incident.priority === priority) &&
    (!search || `${incident.reference} ${incident.title} ${incident.reporterName} ${incident.authorityName || ""}`.toLowerCase().includes(search.toLowerCase()))
  ), [incidents, status, priority, search]);

  async function claim(incident: Incident) {
    if (!user || !profile) return;
    await updateDoc(doc(db, "incidents", incident.id), {
      assignedUserId: user.uid,
      assignedUserName: profile.displayName,
      status: incident.status === "submitted" || incident.status === "under_review" ? "assigned" : incident.status,
      updatedAt: serverTimestamp(),
    });
    await addDoc(collection(db, "incidents", incident.id, "timeline"), { actorId: user.uid, actorName: profile.displayName, type: "assigned", note: `Assigned to ${profile.displayName}.`, createdAt: serverTimestamp() });
    await addDoc(collection(db, "auditLogs"), { actorId: user.uid, actorName: profile.displayName, action: "incident.claimed", targetType: "incident", targetId: incident.id, details: incident.reference, createdAt: serverTimestamp() });
  }

  const open = incidents.filter((item) => !["closed", "resolved", "rejected", "cancelled"].includes(item.status));

  return (
    <AppShell>
      <PageHeader eyebrow="Authority operations" title="Response command centre" description="Monitor, acknowledge, assign and resolve incidents in real time. All actions are timestamped." />
      <div className="grid-3" style={{ marginBottom: 18 }}>
        {[
          [Radio, "Open incidents", open.length],
          [Clock3, "Critical queue", open.filter((item) => item.priority === "critical").length],
          [UserCheck, "Assigned to you", open.filter((item) => item.assignedUserId === user?.uid).length],
        ].map(([Icon, label, value]) => { const StatIcon = Icon as typeof Radio; return <div className="card-flat" key={String(label)} style={{ padding: "1.15rem", display: "flex", justifyContent: "space-between" }}><div><span className="muted">{String(label)}</span><strong style={{ display: "block", fontSize: "2rem" }}>{String(value)}</strong></div><StatIcon color="var(--primary)" /></div>; })}
      </div>
      <section className="card" style={{ padding: "1rem", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(180px,1fr) 180px 160px", gap: 10 }}>
          <label className="field"><span className="label"><Filter size={14} style={{ display: "inline" }} /> Search</span><input className="input" placeholder="Reference, title, citizen or authority" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
          <label className="field"><span className="label">Status</span><select className="select" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="all">All statuses</option>{Object.entries(STATUS_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label className="field"><span className="label">Priority</span><select className="select" value={priority} onChange={(e) => setPriority(e.target.value)}><option value="all">All priorities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
        </div>
      </section>
      {loading ? <Spinner label="Loading operations" /> : filtered.length === 0 ? <EmptyState icon={<ClipboardCheck size={42} />} title="Queue is clear" description="No incidents match the current filters." /> : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((incident) => (
            <article key={incident.id} className="card-flat" style={{ padding: "1rem", display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "center", borderLeft: `5px solid ${incident.priority === "critical" ? "var(--danger)" : incident.priority === "high" ? "var(--warning)" : "var(--primary)"}` }}>
              <div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}><strong>{incident.title}</strong><PriorityBadge priority={incident.priority} /><StatusBadge status={incident.status} /></div><p className="muted" style={{ margin: ".35rem 0", maxWidth: 760 }}>{incident.description.slice(0, 170)}{incident.description.length > 170 ? "…" : ""}</p><div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: ".8rem" }}><span>{incident.reference}</span><span><MapPinned size={14} style={{ display: "inline", verticalAlign: "-2px" }} /> {incident.location.latitude.toFixed(4)}, {incident.location.longitude.toFixed(4)}</span><span>{incident.authorityName || "Unassigned authority"}</span><span>{incident.assignedUserName ? `Responder: ${incident.assignedUserName}` : "No responder"}</span></div></div>
              <div style={{ display: "grid", gap: 7 }}><Link href={`/reports/${incident.id}`} className="btn btn-primary">Open <ArrowRight size={16} /></Link>{!incident.assignedUserId && <button className="btn btn-secondary" onClick={() => claim(incident)}>Claim</button>}</div>
            </article>
          ))}
        </div>
      )}
      <style jsx>{`@media (max-width: 720px){ section.card > div { grid-template-columns: 1fr !important; } article { grid-template-columns: 1fr !important; } }`}</style>
    </AppShell>
  );
}

export default function AuthorityPage() {
  return <ProtectedPage staffOnly><Operations /></ProtectedPage>;
}
