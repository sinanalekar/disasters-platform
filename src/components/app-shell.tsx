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
import { ROLE_LABELS } from "@/lib/constants";
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
  const { profile, isAdmin, isStaff, signOut } = useAuth();
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
          <nav aria-label="Primary navigation" style={{ display: "flex", alignItems: "center", gap: 4 }} className="desktop-nav">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={clsx("btn btn-ghost", pathname.startsWith(href) && "active-nav")} style={pathname.startsWith(href) ? { background: "var(--primary-soft)" } : undefined}>
                <Icon size={18} /> {label}
              </Link>
            ))}
          </nav>
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
      <main id="main-content" className="container" style={{ paddingBlock: "2rem 7rem" }}>{children}</main>
      <nav aria-label="Mobile navigation" className="mobile-nav">
        {nav.slice(0, 5).map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={clsx(pathname.startsWith(href) && "mobile-active")}>
            <Icon size={21} /> <span>{label}</span>
          </Link>
        ))}
      </nav>
      <style jsx global>{`
        .mobile-nav { display: none; }
        @media (max-width: 900px) {
          .desktop-nav { display: none !important; }
          .desktop-only { display: none; }
          .mobile-nav {
            position: fixed; z-index: 60; left: 0; right: 0; bottom: 0;
            display: grid; grid-auto-flow: column; grid-auto-columns: 1fr;
            background: var(--surface); border-top: 1px solid var(--border);
            padding: .35rem max(.35rem, env(safe-area-inset-right)) calc(.35rem + env(safe-area-inset-bottom)) max(.35rem, env(safe-area-inset-left));
          }
          .mobile-nav a { display: grid; place-items: center; gap: 2px; padding: .35rem .2rem; color: var(--muted); font-size: .66rem; font-weight: 800; }
          .mobile-nav a.mobile-active { color: var(--primary); background: var(--primary-soft); border-radius: 10px; }
        }
      `}</style>
    </div>
  );
}
