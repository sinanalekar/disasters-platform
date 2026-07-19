"use client";

import Link from "next/link";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ArrowRight, MessageSquareText } from "lucide-react";
import { AppShell, ProtectedPage } from "@/components/app-shell";
import { EmptyState, PageHeader, Spinner, StatusBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import type { Incident } from "@/lib/types";

function Messages() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db, "incidents"), where("reporterId", "==", user.uid), orderBy("updatedAt", "desc")), (snapshot) => {
      setIncidents(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Incident))); setLoading(false);
    }, () => setLoading(false));
  }, [user]);
  return <AppShell><PageHeader eyebrow="Conversations" title="Incident messages" description="Secure, incident-specific communication with dispatchers and responders." />{loading ? <Spinner label="Loading conversations" /> : incidents.length === 0 ? <EmptyState icon={<MessageSquareText size={42} />} title="No conversations" description="Submit a report to start a secure conversation with the response team." /> : <div style={{ display: "grid", gap: 10 }}>{incidents.map((incident) => <Link key={incident.id} href={`/reports/${incident.id}`} className="card-flat" style={{ padding: "1rem", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center" }}><div style={{ width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--primary-soft)", color: "var(--primary)" }}><MessageSquareText size={21} /></div><div><strong>{incident.title}</strong><div className="muted" style={{ fontSize: ".8rem" }}>{incident.reference} · {incident.authorityName || "Dispatcher queue"}</div></div><div style={{ display: "flex", alignItems: "center", gap: 8 }}><StatusBadge status={incident.status} /><ArrowRight size={18} /></div></Link>)}</div>}</AppShell>;
}

export default function MessagesPage() { return <ProtectedPage><Messages /></ProtectedPage>; }
