"use client";

import Link from "next/link";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ClipboardList, Clock3, MessageSquareText, Plus, ShieldCheck } from "lucide-react";
import { AppShell, ProtectedPage } from "@/components/app-shell";
import { EmptyState, PageHeader, PriorityBadge, Spinner, StatusBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import type { Incident } from "@/lib/types";

function Dashboard() {
  const { user, profile, isStaff } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const incidentsQuery = query(collection(db, "incidents"), where("reporterId", "==", user.uid), orderBy("createdAt", "desc"));
    return onSnapshot(incidentsQuery, (snapshot) => {
      setIncidents(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Incident)));
      setLoading(false);
    }, () => setLoading(false));
  }, [user]);

  const stats = useMemo(() => ({
    total: incidents.length,
    active: incidents.filter((item) => !["closed", "resolved", "rejected", "cancelled"].includes(item.status)).length,
    resolved: incidents.filter((item) => ["resolved", "closed"].includes(item.status)).length,
  }), [incidents]);

  return (
    <AppShell>
      <PageHeader eyebrow="Citizen dashboard" title={`Hello, ${profile?.displayName?.split(" ")[0] || "there"}`} description="Track reports, read authority updates, and continue conversations from one place." action={<Link href="/report" className="btn btn-primary"><Plus size={18} /> New report</Link>} />
      <div className="grid-3" style={{ marginBottom: 20 }}>
        {[
          [ClipboardList, "Total reports", stats.total],
          [Clock3, "Active", stats.active],
          [ShieldCheck, "Resolved", stats.resolved],
        ].map(([Icon, label, value]) => {
          const StatIcon = Icon as typeof ClipboardList;
          return <div className="card-flat" key={String(label)} style={{ padding: "1.2rem", display: "flex", justifyContent: "space-between", gap: 12 }}><div><div className="muted">{String(label)}</div><strong style={{ fontSize: "2rem" }}>{String(value)}</strong></div><StatIcon size={28} color="var(--primary)" /></div>;
        })}
      </div>
      {isStaff && <div className="alert" style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><span>You also have authority access for operational incident handling.</span><Link href="/authority" className="btn btn-secondary">Open operations <ArrowRight size={17} /></Link></div>}
      <section className="card" style={{ padding: "clamp(1rem, 3vw, 1.5rem)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 14 }}><div><div className="eyebrow">Live tracking</div><h2 style={{ margin: ".2rem 0" }}>Your reports</h2></div><MessageSquareText size={25} color="var(--primary)" /></div>
        {loading ? <Spinner label="Loading reports" /> : incidents.length === 0 ? <EmptyState icon={<ClipboardList size={42} />} title="No reports yet" description="When you report an incident or civic issue, its live status and authority conversation will appear here." action={<Link href="/report" className="btn btn-primary">Create your first report</Link>} /> : (
          <div style={{ display: "grid", gap: 10 }}>
            {incidents.map((incident) => (
              <Link href={`/reports/${incident.id}`} key={incident.id} className="card-flat" style={{ padding: "1rem", display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
                <div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}><strong>{incident.title}</strong><PriorityBadge priority={incident.priority} /><StatusBadge status={incident.status} /></div><div className="muted" style={{ fontSize: ".84rem", marginTop: 6 }}>{incident.reference} · {incident.authorityName || "Awaiting authority assignment"}</div></div>
                <ArrowRight size={19} color="var(--primary)" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

export default function DashboardPage() {
  return <ProtectedPage><Dashboard /></ProtectedPage>;
}
