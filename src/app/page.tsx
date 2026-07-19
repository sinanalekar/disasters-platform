"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bot, CheckCircle2, MapPin, MessageSquareText, ShieldCheck, Siren } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const steps = [
  ["01", "Report", "Add a photo or video, description and your current location."],
  ["02", "Detect", "AI assists with category, urgency and duplicate-risk assessment."],
  ["03", "Respond", "The configured authority receives the incident and acknowledges it."],
  ["04", "Resolve", "Follow progress, message responders and confirm the resolution."],
];

export default function Home() {
  const { user } = useAuth();
  return (
    <main id="main-content">
      <div style={{ background: "var(--primary-strong)", color: "white" }}>
        <div className="container" style={{ minHeight: 74, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Image src="/icons/icon-192.png" alt="Disasters emblem" width={50} height={50} style={{ borderRadius: 10 }} priority />
            <div><strong style={{ fontSize: "1.2rem" }}>Disasters</strong><div style={{ opacity: .78, fontSize: ".72rem" }}>Emergency & Public Safety Platform</div></div>
          </Link>
          <div style={{ display: "flex", gap: 8 }}>
            <a className="btn" href="tel:112" style={{ color: "white", background: "var(--danger)" }}><Siren size={18} /> Call 112</a>
            <Link className="btn" href={user ? "/dashboard" : "/auth"} style={{ color: "var(--primary-strong)", background: "white" }}>
              {user ? "Open dashboard" : "Sign in"} <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>

      <section className="container" style={{ display: "grid", gridTemplateColumns: "1.08fr .92fr", gap: "clamp(2rem, 7vw, 6rem)", alignItems: "center", paddingBlock: "clamp(3rem, 9vw, 7rem)" }}>
        <div>
          <div className="eyebrow">For Indian cities</div>
          <h1 style={{ fontSize: "clamp(2.6rem, 7vw, 5.5rem)", lineHeight: .95, letterSpacing: "-.065em", margin: ".75rem 0 1.2rem" }}>
            Help reaches the <span style={{ color: "var(--primary)" }}>right place</span>, faster.
          </h1>
          <p className="muted" style={{ fontSize: "clamp(1.05rem, 2vw, 1.28rem)", maxWidth: 670 }}>
            One trusted channel for reporting emergencies and civic issues, coordinating authorities, and tracking every action through resolution.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 26 }}>
            <Link href={user ? "/report" : "/auth?next=/report"} className="btn btn-primary" style={{ paddingInline: "1.35rem" }}><Siren size={20} /> Report an incident</Link>
            <Link href={user ? "/dashboard" : "/auth"} className="btn btn-secondary">Track a report <ArrowRight size={18} /></Link>
          </div>
          <div className="alert alert-danger" style={{ marginTop: 28, maxWidth: 650 }}>
            <strong>Immediate danger?</strong> Do not wait for an upload. Call <a href="tel:112" style={{ fontWeight: 900, textDecoration: "underline" }}>112</a> first.
          </div>
        </div>
        <div className="card" style={{ padding: "clamp(1rem, 3vw, 2rem)", background: "white" }}>
          <Image src="/brand/disasters-logo.png" alt="Disasters – Emergency and Public Safety Platform" width={1254} height={1254} style={{ width: "100%", height: "auto" }} priority />
        </div>
      </section>

      <section style={{ background: "var(--primary-strong)", color: "white", paddingBlock: "4.5rem" }}>
        <div className="container">
          <div className="eyebrow" style={{ color: "var(--focus)" }}>How it works</div>
          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", margin: ".5rem 0 2rem", letterSpacing: "-.04em" }}>A clear response pipeline</h2>
          <div className="grid-2">
            {steps.map(([number, title, copy]) => (
              <article key={number} style={{ padding: "1.3rem 0", borderTop: "1px solid rgba(255,255,255,.25)", display: "grid", gridTemplateColumns: "54px 1fr", gap: 12 }}>
                <strong style={{ color: "var(--focus)" }}>{number}</strong>
                <div><h3 style={{ margin: 0, fontSize: "1.3rem" }}>{title}</h3><p style={{ opacity: .76, margin: ".35rem 0 0" }}>{copy}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="container" style={{ paddingBlock: "5rem" }}>
        <div className="grid-3">
          {[
            [MapPin, "Location-aware routing", "Route reports by department, category and configurable jurisdiction."],
            [Bot, "Human-controlled AI", "Gemini or local Ollama models assist triage while critical decisions remain reviewable."],
            [MessageSquareText, "Real-time coordination", "Citizens, dispatchers and responders share one timestamped incident conversation."],
            [ShieldCheck, "Role-based administration", "Fine-grained permissions, invitations, suspension controls and immutable audit history."],
            [CheckCircle2, "Transparent resolution", "Every status change is visible, and resolution evidence stays attached to the case."],
            [Siren, "Emergency-first design", "Fast actions, accessible themes and a persistent call-112 safety route."],
          ].map(([Icon, title, copy]) => {
            const FeatureIcon = Icon as typeof MapPin;
            return <article className="card-flat" key={String(title)} style={{ padding: "1.35rem" }}><FeatureIcon size={28} color="var(--primary)" /><h3 style={{ margin: ".9rem 0 .35rem" }}>{String(title)}</h3><p className="muted" style={{ margin: 0 }}>{String(copy)}</p></article>;
          })}
        </div>
      </section>

      <footer style={{ borderTop: "1px solid var(--border)", paddingBlock: "2rem" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <strong>Disasters</strong><span className="muted">Report · Detect · Respond · Resolve</span>
        </div>
      </footer>
      <style jsx>{`@media (max-width: 820px) { section.container:first-of-type { grid-template-columns: 1fr !important; } }`}</style>
    </main>
  );
}
