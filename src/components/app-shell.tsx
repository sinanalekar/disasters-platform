"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import {
  Bell,
  ChevronRight,
  CircleUserRound,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  PlusCircle,
  Settings,
  ShieldCheck,
  Siren,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/lib/auth-context";
import { ROLE_LABELS, SUPER_ADMIN_EMAIL } from "@/lib/constants";
import { Spinner } from "./ui";

const citizenNav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/report", label: "Report", icon: PlusCircle },
  { href: "/messages", label: "Messages", icon: MessageSquareText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function ProtectedPage({ children, adminOnly = false, staffOnly = false }: {
  children: ReactNode;
  adminOnly?: boolean;
  staffOnly?: boolean;
}) {
  const { user, loading, isAdmin, isStaff } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
    else if (!loading && adminOnly && !isAdmin) router.replace("/dashboard");
    else if (!loading && staffOnly && !isStaff && !isAdmin) router.replace("/dashboard");
  }, [loading, user, adminOnly, staffOnly, isAdmin, isStaff, router]);

  if (loading || !user) return <Spinner label="Securing your session" />;
  if (adminOnly && !isAdmin) return <Spinner label="Checking administrator access" />;
  if (staffOnly && !isStaff && !isAdmin) return <Spinner label="Checking authority access" />;
  return <>{children}</>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, profile, isAdmin, isStaff, signOut } = useAuth();
  const needsAdminVerification = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL && !user.emailVerified;
  const nav = [
    ...citizenNav,
    ...(isStaff || isAdmin ? [{ href: "/authority", label: "Operations", icon: ClipboardList }] : []),
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: ShieldCheck }] : []),
  ];

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ background: "var(--danger)", color: "white", padding: "0.44rem 1rem", textAlign: "center", fontWeight: 800, fontSize: ".84rem" }}>
        <Siren size={15} style={{ display: "inline", marginRight: 7, verticalAlign: "-2px" }} />
        Immediate life-threatening danger? Call India emergency number <a href="tel:112" style={{ textDecoration: "underline" }}>112</a>
      </div>
      <header style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 40 }}>
        <div className="container" style={{ minHeight: 72, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <Link href="/dashboard" aria-label="Disasters home" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Image src="/icons/icon-192.png" alt="" width={46} height={46} priority />
            <div>
              <strong style={{ display: "block", fontSize: "1.1rem", letterSpacing: "-.02em" }}>Disasters</strong>
              <span className="muted" style={{ fontSize: ".7rem" }}>Report · Detect · Respond</span>
            </div>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link href="/notifications" className="btn btn-ghost" aria-label="Notifications"><Bell size={20} /></Link>
            <details style={{ position: "relative" }}>
              <summary className="btn btn-secondary" style={{ listStyle: "none" }}>
                <CircleUserRound size={20} />
                <span className="desktop-only">{profile?.displayName || "Account"}</span>
              </summary>
              <div className="card" style={{ position: "absolute", right: 0, top: 52, width: 260, padding: 12, zIndex: 50 }}>
                <div style={{ padding: 8 }}>
                  <strong>{profile?.displayName}</strong>
                  <div className="muted" style={{ fontSize: ".8rem", wordBreak: "break-all" }}>{profile?.email}</div>
                  <span className="badge" style={{ marginTop: 8 }}>{profile ? ROLE_LABELS[profile.role] : "Citizen"}</span>
                </div>
                <Link href="/settings" className="btn btn-ghost" style={{ width: "100%", justifyContent: "space-between" }}>Account settings <ChevronRight size={16} /></Link>
                <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "flex-start", color: "var(--danger)" }} onClick={() => signOut()}><LogOut size={17} /> Sign out</button>
              </div>
            </details>
          </div>
        </div>
      </header>
      <main id="main-content" className="container" style={{ paddingBlock: "2rem 7rem" }}>
        {needsAdminVerification && (
          <div className="alert" role="status" style={{ marginBottom: 18 }}>
            Check your email and verify this address, then sign out and sign in again to activate super administrator access.
          </div>
        )}
        {children}
      </main>
      <nav aria-label="Primary navigation" className="floating-nav">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={clsx(pathname.startsWith(href) && "floating-active")}>
            <Icon size={21} /> <span>{label}</span>
          </Link>
        ))}
      </nav>
      <style jsx global>{`
        .floating-nav {
          position: fixed; z-index: 60; left: 50%; transform: translateX(-50%);
          bottom: max(12px, env(safe-area-inset-bottom));
          display: flex; align-items: stretch; gap: 4px;
          max-width: calc(100vw - 24px); overflow-x: auto; scrollbar-width: none;
          padding: 7px; border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
          border-radius: 24px; background: color-mix(in srgb, var(--surface) 92%, transparent);
          box-shadow: 0 18px 48px rgba(7, 59, 103, .2), 0 3px 10px rgba(15, 23, 42, .12);
          backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
        }
        .floating-nav::-webkit-scrollbar { display: none; }
        .floating-nav a {
          min-width: 76px; min-height: 56px; padding: 7px 10px;
          display: grid; place-items: center; align-content: center; gap: 3px;
          color: var(--muted); border-radius: 17px; font-size: .68rem; font-weight: 850;
          transition: transform .18s ease, background .18s ease, color .18s ease;
        }
        .floating-nav a:hover { color: var(--primary); background: var(--primary-soft); transform: translateY(-1px); }
        .floating-nav a.floating-active { color: white; background: var(--primary); box-shadow: 0 7px 18px color-mix(in srgb, var(--primary) 30%, transparent); }
        @media (max-width: 900px) {
          .desktop-only { display: none; }
          .floating-nav { width: calc(100vw - 20px); justify-content: flex-start; border-radius: 21px; bottom: max(8px, env(safe-area-inset-bottom)); }
          .floating-nav a { flex: 1 0 58px; min-width: 58px; min-height: 52px; padding-inline: 5px; font-size: .62rem; }
        }
      `}</style>
    </div>
  );
}
