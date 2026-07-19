"use client";

import Link from "next/link";
import Image from "next/image";
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Bot, ExternalLink, MapPin, MessageSquareText, Send, ShieldCheck, Siren } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AppShell, ProtectedPage } from "./app-shell";
import { PageHeader, PriorityBadge, Spinner, StatusBadge } from "./ui";
import { useAuth } from "@/lib/auth-context";
import { STATUS_FLOW, STATUS_LABELS } from "@/lib/constants";
import { db } from "@/lib/firebase";
import type { Incident, IncidentStatus, Message } from "@/lib/types";

function Detail({ incidentId }: { incidentId: string }) {
  const { user, profile, isStaff } = useAuth();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dispatchNotice, setDispatchNotice] = useState("");

  useEffect(() => {
    const unsubscribeIncident = onSnapshot(doc(db, "incidents", incidentId), (snapshot) => {
      setIncident(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Incident) : null);
      setLoading(false);
    }, (err) => { setError(err.message); setLoading(false); });
    const unsubscribeMessages = onSnapshot(query(collection(db, "incidents", incidentId, "messages"), orderBy("createdAt", "asc")), (snapshot) => {
      setMessages(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Message)));
    });
    return () => { unsubscribeIncident(); unsubscribeMessages(); };
  }, [incidentId]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!user || !profile || !incident || !text.trim()) return;
    await addDoc(collection(db, "incidents", incidentId, "messages"), {
      incidentId,
      senderId: user.uid,
      senderName: profile.displayName,
      senderRole: profile.role,
      text: text.trim().slice(0, 2000),
      createdAt: serverTimestamp(),
    });
    const recipientId = isStaff ? incident.reporterId : incident.assignedUserId;
    if (recipientId && recipientId !== user.uid) {
      await addDoc(collection(db, "notifications"), {
        userId: recipientId,
        createdBy: user.uid,
        type: "message",
        title: `New message on ${incident.reference}`,
        body: text.trim().slice(0, 160),
        url: `/reports/${incidentId}`,
        read: false,
        createdAt: serverTimestamp(),
      });
    }
    setText("");
    if (Notification.permission === "granted" && document.hidden) {
      new Notification("Disasters message sent", { body: "Your incident conversation was updated.", icon: "/icons/icon-192.png" });
    }
  }

  async function setStatus(status: IncidentStatus) {
    if (!user || !profile || !incident) return;
    await updateDoc(doc(db, "incidents", incidentId), { status, updatedAt: serverTimestamp(), ...(status === "resolved" ? { resolvedAt: serverTimestamp() } : {}) });
    await addDoc(collection(db, "incidents", incidentId, "timeline"), { actorId: user.uid, actorName: profile.displayName, type: status, note: `Status changed to ${STATUS_LABELS[status]}.`, createdAt: serverTimestamp() });
    if (incident.reporterId !== user.uid) {
      await addDoc(collection(db, "notifications"), { userId: incident.reporterId, createdBy: user.uid, type: "status", title: `${incident.reference}: ${STATUS_LABELS[status]}`, body: `${profile.displayName} updated your incident.`, url: `/reports/${incidentId}`, read: false, createdAt: serverTimestamp() });
    }
  }

  async function dispatch() {
    if (!user || !profile) return;
    setDispatchNotice("Contacting configured authority…");
    try {
      const response = await fetch("/api/dispatch", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ incidentId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Dispatch failed");
      await addDoc(collection(db, "incidents", incidentId, "timeline"), { actorId: user.uid, actorName: profile.displayName, type: "dispatched", note: result.message || `Dispatch initiated through ${result.mode}.`, createdAt: serverTimestamp() });
      if (result.actionUrl) window.location.href = result.actionUrl;
      setDispatchNotice(result.message || `Dispatch opened through ${result.mode}.`);
    } catch (err) { setDispatchNotice(err instanceof Error ? err.message : "Dispatch failed"); }
  }

  if (loading) return <AppShell><Spinner label="Loading incident" /></AppShell>;
  if (!incident) return <AppShell><div className="alert alert-danger">Incident not found or you do not have access.</div></AppShell>;

  return (
    <AppShell>
      <Link href={isStaff ? "/authority" : "/dashboard"} className="btn btn-ghost" style={{ paddingLeft: 0, marginBottom: 8 }}><ArrowLeft size={18} /> Back</Link>
      <PageHeader eyebrow={incident.reference} title={incident.title} description={incident.description} action={<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><PriorityBadge priority={incident.priority} /><StatusBadge status={incident.status} /></div>} />
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="grid-2" style={{ alignItems: "start" }}>
        <div style={{ display: "grid", gap: 16 }}>
          <section className="card" style={{ padding: "1.35rem" }}>
            <div className="eyebrow">Incident details</div>
            <dl style={{ display: "grid", gap: 13, marginBottom: 0 }}>
              <div><dt className="muted">Authority</dt><dd style={{ margin: 0, fontWeight: 800 }}>{incident.authorityName || "Dispatcher review queue"}</dd></div>
              <div><dt className="muted">Category</dt><dd style={{ margin: 0, textTransform: "capitalize" }}>{incident.category}</dd></div>
              <div><dt className="muted">Location</dt><dd style={{ margin: 0 }}><a href={`https://www.openstreetmap.org/?mlat=${incident.location.latitude}&mlon=${incident.location.longitude}#map=17/${incident.location.latitude}/${incident.location.longitude}`} target="_blank" rel="noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}><MapPin size={16} style={{ display: "inline", verticalAlign: "-3px" }} /> Open map <ExternalLink size={13} style={{ display: "inline" }} /></a></dd></div>
            </dl>
            {incident.media?.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginTop: 18 }}>{incident.media.map((media) => media.type.startsWith("image/") ? <Image key={media.url} src={media.url} alt={`Incident evidence: ${media.name}`} width={800} height={600} unoptimized style={{ width: "100%", height: "auto", aspectRatio: "4/3", objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)" }} /> : <video key={media.url} src={media.url} controls style={{ width: "100%", borderRadius: 10 }} />)}</div>}
          </section>
          {incident.ai && <section className="card-flat" style={{ padding: "1.35rem", background: "var(--primary-soft)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><div className="eyebrow">AI assessment</div><h2 style={{ margin: ".25rem 0" }}>{incident.ai.model}</h2></div><Bot size={26} color="var(--primary)" /></div><p>{incident.ai.summary}</p><ul>{incident.ai.reasoning.map((reason) => <li key={reason}>{reason}</li>)}</ul><div className="badge">{Math.round(incident.ai.confidence * 100)}% confidence · {incident.ai.requiresHumanReview ? "Human review required" : "Within auto-routing threshold"}</div></section>}
          {isStaff && <section className="card" style={{ padding: "1.35rem" }}><div className="eyebrow">Authority controls</div><h2 style={{ margin: ".25rem 0 1rem" }}>Dispatch & response status</h2><button className="btn btn-danger" onClick={dispatch} style={{ marginBottom: 12 }}><Siren size={17} /> Dispatch through configured channel</button>{dispatchNotice && <div className="alert" style={{ marginBottom: 12 }}>{dispatchNotice}</div>}<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{STATUS_FLOW.map((status) => <button key={status} className={status === incident.status ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setStatus(status)} disabled={status === incident.status}>{STATUS_LABELS[status]}</button>)}</div></section>}
        </div>
        <section className="card" style={{ overflow: "hidden", position: "sticky", top: 96 }}>
          <div style={{ padding: "1rem 1.2rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}><div><div className="eyebrow">Secure thread</div><h2 style={{ margin: 0 }}>Incident messages</h2></div><MessageSquareText color="var(--primary)" /></div>
          <div aria-live="polite" style={{ height: 430, overflowY: "auto", padding: "1rem", display: "grid", alignContent: "start", gap: 10 }}>
            {messages.length === 0 && <div style={{ textAlign: "center", padding: "3rem 1rem" }}><ShieldCheck size={34} color="var(--primary)" /><p className="muted">Messages between the citizen and response team will appear here.</p></div>}
            {messages.map((message) => <div key={message.id} style={{ justifySelf: message.senderId === user?.uid ? "end" : "start", maxWidth: "84%", background: message.senderId === user?.uid ? "var(--primary)" : "var(--surface-muted)", color: message.senderId === user?.uid ? "white" : "var(--text)", padding: ".7rem .85rem", borderRadius: 14 }}><div style={{ fontSize: ".73rem", opacity: .75, fontWeight: 800 }}>{message.senderName} · {message.senderRole.replace("_", " ")}</div><div style={{ whiteSpace: "pre-wrap" }}>{message.text}</div><div style={{ fontSize: ".68rem", opacity: .65, marginTop: 3 }}>{message.createdAt?.toDate ? formatDistanceToNow(message.createdAt.toDate(), { addSuffix: true }) : "Sending…"}</div></div>)}
          </div>
          <form onSubmit={sendMessage} style={{ padding: ".8rem", borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}><label><span className="sr-only">Message</span><input className="input" placeholder="Write an update…" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} /></label><button className="btn btn-primary" aria-label="Send message" disabled={!text.trim()}><Send size={18} /></button></form>
        </section>
      </div>
    </AppShell>
  );
}

export function ReportDetail({ incidentId }: { incidentId: string }) {
  return <ProtectedPage><Detail incidentId={incidentId} /></ProtectedPage>;
}
