"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

function AuthForm() {
  const { user, signIn, signUp, resetPassword } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (user) router.replace(search.get("next") || "/dashboard");
  }, [user, router, search]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      if (mode === "signup") await signUp(name.trim(), email.trim(), password);
      else await signIn(email.trim(), password);
      router.push(search.get("next") || "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message.replace("Firebase: ", "") : "Unable to continue.");
    } finally { setBusy(false); }
  }

  async function forgot() {
    if (!email) { setError("Enter your email first."); return; }
    setBusy(true); setError("");
    try { await resetPassword(email); setNotice("Password reset email sent."); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to send reset email."); }
    finally { setBusy(false); }
  }

  return (
    <main id="main-content" style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr minmax(360px, 560px)" }}>
      <section style={{ background: "var(--primary-strong)", color: "white", padding: "clamp(2rem, 6vw, 6rem)", display: "grid", alignContent: "center" }}>
        <Link href="/" style={{ display: "inline-flex", gap: 8, alignItems: "center", marginBottom: "auto" }}><ArrowLeft size={18} /> Home</Link>
        <div style={{ maxWidth: 630 }}>
          <Image src="/icons/icon-512.png" alt="Disasters" width={106} height={106} style={{ borderRadius: 20, marginBottom: 22 }} />
          <div className="eyebrow" style={{ color: "var(--focus)" }}>Emergency & public safety</div>
          <h1 style={{ fontSize: "clamp(2.4rem, 6vw, 4.8rem)", letterSpacing: "-.06em", lineHeight: 1, margin: ".6rem 0 1rem" }}>One account. Every report. Full visibility.</h1>
          <p style={{ opacity: .78, fontSize: "1.12rem" }}>Create incidents, receive live updates, message the responding team, and confirm when the issue is resolved.</p>
        </div>
        <p style={{ marginTop: "auto", opacity: .68 }}><ShieldCheck size={17} style={{ display: "inline", verticalAlign: "-3px" }} /> Protected by Firebase Authentication and role-based access controls.</p>
      </section>
      <section style={{ padding: "clamp(1.5rem, 6vw, 4rem)", display: "grid", alignContent: "center", background: "var(--surface)" }}>
        <div style={{ maxWidth: 430, width: "100%", margin: "0 auto" }}>
          <div className="eyebrow">Welcome</div>
          <h2 style={{ fontSize: "2rem", margin: ".35rem 0 .5rem" }}>{mode === "signin" ? "Sign in to continue" : "Create your citizen account"}</h2>
          <p className="muted" style={{ marginTop: 0 }}>{mode === "signin" ? "Use your registered email and password." : "You can report and track incidents immediately."}</p>
          {error && <div className="alert alert-danger" role="alert" style={{ marginBottom: 16 }}>{error}</div>}
          {notice && <div className="alert" role="status" style={{ marginBottom: 16 }}>{notice}</div>}
          <form onSubmit={submit} style={{ display: "grid", gap: 15 }}>
            {mode === "signup" && <label className="field"><span className="label">Full name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" /></label>}
            <label className="field"><span className="label">Email address</span><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
            <label className="field"><span className="label">Password</span><div style={{ position: "relative" }}><input className="input" style={{ paddingRight: 48 }} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} /><button type="button" className="btn btn-ghost" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 2, top: 2, minHeight: 40, padding: 8 }}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
            {mode === "signin" && <button type="button" className="btn btn-ghost" onClick={forgot} style={{ justifySelf: "end", minHeight: 30, padding: 0 }}>Forgot password?</button>}
            <button className="btn btn-primary" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
          </form>
          <p style={{ textAlign: "center", marginTop: 20 }}>{mode === "signin" ? "New to Disasters?" : "Already have an account?"} <button className="btn btn-ghost" style={{ minHeight: 30, padding: 4 }} onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>{mode === "signin" ? "Create account" : "Sign in"}</button></p>
        </div>
      </section>
      <style jsx>{`@media (max-width: 850px) { main { grid-template-columns: 1fr !important; } main > section:first-child { min-height: 320px; } }`}</style>
    </main>
  );
}

export default function AuthPage() {
  return <Suspense><AuthForm /></Suspense>;
}
