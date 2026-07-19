"use client";

import Link from "next/link";
import { collection, doc, onSnapshot, orderBy, query, updateDoc, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { BellRing, CheckCheck } from "lucide-react";
import { AppShell, ProtectedPage } from "@/components/app-shell";
import { EmptyState, PageHeader, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";

interface AppNotification { id: string; userId: string; title: string; body: string; url: string; read: boolean; createdAt?: { toDate: () => Date }; }

function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db, "notifications"), where("userId", "==", user.uid), orderBy("createdAt", "desc")), (snapshot) => { setItems(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as AppNotification))); setLoading(false); }, () => setLoading(false));
  }, [user]);
  return <AppShell><PageHeader eyebrow="Live alerts" title="Notifications" description="Status changes and incident messages appear here in real time." action={items.some((item) => !item.read) ? <button className="btn btn-secondary" onClick={() => Promise.all(items.filter((item) => !item.read).map((item) => updateDoc(doc(db, "notifications", item.id), { read: true })))}><CheckCheck size={17} /> Mark all read</button> : undefined} />{loading ? <Spinner label="Loading notifications" /> : items.length === 0 ? <EmptyState icon={<BellRing size={42} />} title="You’re all caught up" description="New assignment, status and message alerts will appear here." /> : <div style={{ display: "grid", gap: 9 }}>{items.map((item) => <Link key={item.id} href={item.url || "/dashboard"} onClick={() => updateDoc(doc(db, "notifications", item.id), { read: true })} className="card-flat" style={{ padding: "1rem", display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, background: item.read ? "var(--surface)" : "var(--primary-soft)" }}><BellRing size={20} color="var(--primary)" /><div><strong>{item.title}</strong><p className="muted" style={{ margin: ".25rem 0" }}>{item.body}</p><span style={{ fontSize: ".75rem" }}>{item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : "Just now"}</span></div></Link>)}</div>}</AppShell>;
}
export default function NotificationsPage() { return <ProtectedPage><Notifications /></ProtectedPage>; }
