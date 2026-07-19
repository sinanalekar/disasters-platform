"use client";

import { upload } from "@vercel/blob/client";
import { addDoc, collection, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Bot, Camera, Check, LocateFixed, MapPin, PhoneCall, UploadCloud } from "lucide-react";
import { AppShell, ProtectedPage } from "@/components/app-shell";
import { PageHeader, PriorityBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { CATEGORIES } from "@/lib/constants";
import { db } from "@/lib/firebase";
import { rulesTriage } from "@/lib/triage";
import type { AiAssessment, Authority, GeoLocation, MediaAttachment } from "@/lib/types";

function ReportForm() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [assessment, setAssessment] = useState<AiAssessment | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  const selectedCategory = useMemo(() => CATEGORIES.find((item) => item.id === category), [category]);

  function locate() {
    setError("");
    if (!navigator.geolocation) { setError("Location is not available on this device."); return; }
    setProgress("Getting your location…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy });
        setProgress("");
      },
      (geoError) => { setError(geoError.message); setProgress(""); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }

  async function runTriage(media?: MediaAttachment[]) {
    if (!user) throw new Error("Please sign in again.");
    const token = await user.getIdToken();
    const response = await fetch("/api/ai/triage", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title,
        description,
        selectedCategory: category,
        mediaUrl: media?.find((item) => item.type.startsWith("image/"))?.url,
        mediaType: media?.find((item) => item.type.startsWith("image/"))?.type,
      }),
    });
    if (!response.ok) return rulesTriage(description, category);
    return response.json() as Promise<AiAssessment>;
  }

  async function uploadFiles() {
    if (!user || files.length === 0) return [];
    const token = await user.getIdToken();
    const uploaded: MediaAttachment[] = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      setProgress(`Uploading ${index + 1} of ${files.length}…`);
      const blob = await upload(`incidents/${user.uid}/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/media",
        clientPayload: token,
        multipart: file.size > 4 * 1024 * 1024,
      });
      uploaded.push({ url: blob.url, name: file.name, type: file.type, size: file.size });
    }
    return uploaded;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user || !profile) return;
    if (!location) { setError("Add your location before submitting."); return; }
    setBusy(true); setError("");
    try {
      const media = await uploadFiles();
      setProgress("AI is assessing the incident…");
      const ai = await runTriage(media);
      setAssessment(ai);

      setProgress("Finding the responsible authority…");
      const authoritiesSnapshot = await getDocs(query(collection(db, "authorities"), where("active", "==", true)));
      const authorities = authoritiesSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Authority));
      const authority = authorities.find((item) => item.categories.includes(ai.category)) || authorities.find((item) => item.categories.includes(category));
      const reference = `DIS-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const incident = await addDoc(collection(db, "incidents"), {
        reference,
        reporterId: user.uid,
        reporterName: profile.displayName,
        reporterEmail: profile.email,
        title: title.trim(),
        description: description.trim(),
        category: ai.category,
        priority: ai.priority,
        status: ai.requiresHumanReview ? "under_review" : authority ? "assigned" : "submitted",
        location,
        media,
        ai,
        authorityId: authority?.id || null,
        authorityName: authority?.name || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await addDoc(collection(db, "incidents", incident.id, "timeline"), {
        actorId: user.uid,
        actorName: profile.displayName,
        type: "submitted",
        note: authority ? `Report routed to ${authority.name}.` : "Report submitted for dispatcher review.",
        createdAt: serverTimestamp(),
      });
      setProgress("Report submitted");
      router.push(`/reports/${incident.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit the report.");
      setProgress("");
    } finally { setBusy(false); }
  }

  return (
    <AppShell>
      <PageHeader eyebrow="New incident" title="Report an issue" description="Give responders clear, accurate information. For immediate danger, call 112 before uploading media." action={<a href="tel:112" className="btn btn-danger"><PhoneCall size={18} /> Call 112</a>} />
      {error && <div className="alert alert-danger" role="alert" style={{ marginBottom: 16 }}>{error}</div>}
      <form onSubmit={submit} className="grid-2" style={{ alignItems: "start" }}>
        <section className="card" style={{ padding: "clamp(1rem, 3vw, 1.5rem)", display: "grid", gap: 16 }}>
          <label className="field"><span className="label">Short title</span><input className="input" placeholder="Example: Smoke coming from apartment building" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
          <label className="field"><span className="label">What is happening?</span><textarea className="textarea" placeholder="Describe what you can see, how many people may be affected, and whether the situation is getting worse." maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} required minLength={8} /></label>
          <label className="field"><span className="label">Issue category</span><select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <div className="field">
            <span className="label">Photo or video <span className="muted">(optional, up to 20 MB each)</span></span>
            <label className="card-flat" style={{ minHeight: 130, display: "grid", placeItems: "center", textAlign: "center", padding: 16, cursor: "pointer", borderStyle: "dashed" }}>
              <UploadCloud size={30} color="var(--primary)" />
              <span><strong>Choose files</strong><br /><span className="muted">JPG, PNG, WebP, MP4 or WebM</span></span>
              <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple hidden onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 3))} />
            </label>
            {files.map((file) => <div key={`${file.name}-${file.size}`} className="badge"><Camera size={14} /> {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</div>)}
          </div>
        </section>

        <section style={{ display: "grid", gap: 16 }}>
          <div className="card" style={{ padding: "1.4rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}><div><div className="eyebrow">Location</div><h2 style={{ margin: ".25rem 0" }}>Where is it?</h2></div><MapPin size={28} color="var(--primary)" /></div>
            {location ? <div className="alert" style={{ marginBlock: 14 }}><Check size={18} color="var(--success)" style={{ display: "inline", verticalAlign: "-4px", marginRight: 6 }} />Location captured to approximately {Math.round(location.accuracy || 0)} metres.<br /><a href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=17/${location.latitude}/${location.longitude}`} target="_blank" rel="noreferrer" style={{ color: "var(--primary)", textDecoration: "underline", fontSize: ".85rem" }}>Preview on OpenStreetMap</a></div> : <p className="muted">Your precise location helps route the report to the correct jurisdiction.</p>}
            <button type="button" className="btn btn-secondary" onClick={locate}><LocateFixed size={18} /> {location ? "Refresh location" : "Use current location"}</button>
          </div>
          <div className="card-flat" style={{ padding: "1.4rem", background: "var(--primary-soft)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><div className="eyebrow">AI-assisted triage</div><h2 style={{ margin: ".25rem 0" }}>{selectedCategory?.label}</h2></div><Bot size={28} color="var(--primary)" /></div>
            <p className="muted">The configured Gemini, local Ollama, or offline rules model will recommend category and priority. Critical and uncertain results remain under human review.</p>
            {assessment && <div style={{ display: "flex", gap: 8, alignItems: "center" }}><PriorityBadge priority={assessment.priority} /><span>{Math.round(assessment.confidence * 100)}% confidence</span></div>}
          </div>
          <button className="btn btn-primary" disabled={busy || !location} style={{ minHeight: 54, fontSize: "1rem" }}>{busy ? progress || "Submitting…" : "Submit report"}</button>
          {progress && <div role="status" className="muted" style={{ textAlign: "center" }}>{progress}</div>}
        </section>
      </form>
    </AppShell>
  );
}

export default function ReportPage() {
  return <ProtectedPage><ReportForm /></ProtectedPage>;
}
