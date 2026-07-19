"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ShieldCheck, Siren, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

function AuthForm() {
  const { user, signInWithGoogle, signInAsGuest } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const [busy, setBusy] = useState<"google" | "guest" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) router.replace(search.get("next") || "/dashboard");
  }, [user, router, search]);

  async function continueWith(method: "google" | "guest") {
    setBusy(method);
    setError("");
    try {
      if (method === "google") await signInWithGoogle();
      else await signInAsGuest();
      router.push(search.get("next") || "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message.replace("Firebase: ", "") : "Sign-in could not be completed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main id="main-content" style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(360px, 560px)", overflowX: "hidden" }}>
      <section style={{ minWidth: 0, background: "var(--primary-strong)", color: "white", padding: "clamp(2rem, 6vw, 6rem)", display: "grid", alignContent: "center" }}>
        <a href="tel:112" style={{ display: "inline-flex", gap: 8, alignItems: "center", marginBottom: "auto" }}><Siren size={18} /> Emergency 112</a>
        <div style={{ maxWidth: 630 }}>
          <Image src="/icons/icon-512.png" alt="Disasters" width={106} height={106} style={{ borderRadius: 20, marginBottom: 22 }} priority />
          <div className="eyebrow" style={{ color: "var(--focus)" }}>Emergency & public safety</div>
          <h1 style={{ fontSize: "clamp(2.4rem, 6vw, 4.8rem)", letterSpacing: "-.06em", lineHeight: 1, margin: ".6rem 0 1rem" }}>One account. Every report. Full visibility.</h1>
          <p style={{ opacity: .78, fontSize: "1.12rem" }}>Report incidents, receive live updates, message responders, and follow every case through resolution.</p>
        </div>
        <p style={{ marginTop: "auto", opacity: .68 }}><ShieldCheck size={17} style={{ display: "inline", verticalAlign: "-3px" }} /> Protected by Firebase Authentication and role-based access controls.</p>
      </section>

      <section style={{ minWidth: 0, padding: "clamp(1.5rem, 6vw, 4rem)", display: "grid", alignContent: "center", background: "var(--surface)" }}>
        <div className="auth-panel" style={{ maxWidth: 430, width: "100%", margin: "0 auto" }}>
          <div className="eyebrow">Welcome to Disasters</div>
          <h2 style={{ fontSize: "2rem", margin: ".35rem 0 .5rem" }}>Choose how to continue</h2>
          <p className="muted" style={{ marginTop: 0, marginBottom: 24 }}>No password is required.</p>

          {error && <div className="alert alert-danger" role="alert" style={{ marginBottom: 16 }}>{error}</div>}

          <div style={{ display: "grid", gap: 12 }}>
            <button type="button" className="btn btn-secondary google-button" onClick={() => continueWith("google")} disabled={busy !== null}>
              <span className="google-mark" aria-hidden="true">G</span>
              {busy === "google" ? "Opening Google…" : "Continue with Google"}
            </button>
            <button type="button" className="btn btn-primary guest-button" onClick={() => continueWith("guest")} disabled={busy !== null}>
              <UserRound size={21} />
              {busy === "guest" ? "Creating guest access…" : "Continue as guest"}
            </button>
          </div>

          <div className="card-flat guest-note">
            <strong>Guest access</strong>
            <p className="muted">Reports and messages remain connected to this browser or device. Use Google when you want access across devices or administrator permissions.</p>
          </div>

          <p className="muted" style={{ textAlign: "center", fontSize: ".78rem", marginTop: 18 }}>By continuing, you agree to use the platform only for genuine public-safety and civic reports.</p>
        </div>
      </section>

      <style jsx>{`
        .auth-panel { padding: clamp(1.25rem, 3vw, 2rem); border: 1px solid var(--border); border-radius: 24px; background: color-mix(in srgb, var(--surface) 96%, transparent); box-shadow: 0 24px 70px rgba(7, 59, 103, .12); }
        .google-button, .guest-button { min-height: 56px; width: 100%; font-size: .98rem; }
        .google-button { background: white; color: #172b4d; border-color: #cbd5e1; }
        .google-mark { display: grid; place-items: center; width: 25px; height: 25px; border-radius: 50%; color: #4285f4; background: #fff; font: 900 1.05rem/1 system-ui; box-shadow: inset 0 0 0 1px #e2e8f0; }
        .guest-note { padding: 14px 16px; margin-top: 18px; }
        .guest-note p { margin: 5px 0 0; font-size: .86rem; }
        @media (max-width: 850px) {
          main { grid-template-columns: 1fr !important; }
          main > section:first-child { min-height: 300px; padding-bottom: 2rem !important; }
          main > section:first-child > div { margin-top: 2.5rem; }
          .auth-panel { border-radius: 20px; }
        }
      `}</style>
    </main>
  );
}

export default function AuthPage() {
  return <Suspense><AuthForm /></Suspense>;
}
