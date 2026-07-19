"use client";

import Image from "next/image";
import { doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { BellRing, Download, Globe2, HardDriveDownload, Smartphone, UserRound } from "lucide-react";
import { AppShell, ProtectedPage } from "@/components/app-shell";
import { PageHeader } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { APK_DOWNLOAD_URL } from "@/lib/constants";
import { db } from "@/lib/firebase";

interface InstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }>; }

function SettingsContent() {
  const { user, profile } = useAuth();
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [name, setName] = useState(profile?.displayName || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [notice, setNotice] = useState("");
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(typeof Notification === "undefined" ? "default" : Notification.permission);
  const [apkUrl, setApkUrl] = useState(APK_DOWNLOAD_URL);

  useEffect(() => {
    const handler = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => onSnapshot(doc(db, "settings", "system"), (snapshot) => setApkUrl(snapshot.data()?.apkUrl || APK_DOWNLOAD_URL)), []);

  async function saveProfile() {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), { displayName: name.trim(), phone: phone.trim(), updatedAt: serverTimestamp() });
    setNotice("Profile saved.");
  }

  async function enableNotifications() {
    const result = await Notification.requestPermission();
    setNotificationPermission(result);
    if (result === "granted") new Notification("Disasters notifications enabled", { body: "You will see incident updates while the app is active.", icon: "/icons/icon-192.png" });
  }

  return (
    <AppShell>
      <PageHeader eyebrow="Account & devices" title="Settings" description="Manage your profile, notifications and app installation." />
      {notice && <div className="alert" style={{ marginBottom: 16 }}>{notice}</div>}
      <div className="grid-2" style={{ alignItems: "start" }}>
        <section className="card" style={{ padding: "1.35rem", display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><div><div className="eyebrow">Profile</div><h2 style={{ margin: ".25rem 0" }}>Personal details</h2></div><UserRound color="var(--primary)" /></div>
          <label className="field"><span className="label">Display name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="field"><span className="label">Email</span><input className="input" value={profile?.email || ""} disabled /></label>
          <label className="field"><span className="label">Phone</span><input className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" /></label>
          <button className="btn btn-primary" onClick={saveProfile}>Save profile</button>
        </section>
        <div style={{ display: "grid", gap: 16 }}>
          <section className="card" style={{ padding: "1.35rem" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}><Image src="/icons/icon-192.png" alt="" width={66} height={66} style={{ borderRadius: 14 }} /><div><div className="eyebrow">Install Disasters</div><h2 style={{ margin: ".2rem 0" }}>Use it like a native app</h2></div></div>
            <p className="muted">Install the lightweight PWA from your browser or download the Android APK. Both use the same secure account and live data.</p>
            <div style={{ display: "grid", gap: 8 }}>
              <button className="btn btn-primary" disabled={!installPrompt} onClick={async () => { await installPrompt?.prompt(); setInstallPrompt(null); }}><HardDriveDownload size={18} /> {installPrompt ? "Install web app" : "Web app already installed or browser menu required"}</button>
              <a className="btn btn-secondary" href={apkUrl}><Smartphone size={18} /> Download Android APK <Download size={16} /></a>
            </div>
            <p className="muted" style={{ fontSize: ".8rem" }}>Android may ask you to allow installation from your browser. Releases are built by the project’s GitHub workflow.</p>
          </section>
          <section className="card-flat" style={{ padding: "1.35rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><div><div className="eyebrow">Alerts</div><h2 style={{ margin: ".25rem 0" }}>Browser notifications</h2></div><BellRing color="var(--primary)" /></div>
            <p className="muted">Receive real-time status and message alerts while the installed app is active.</p>
            <button className="btn btn-secondary" onClick={enableNotifications} disabled={notificationPermission === "granted"}>{notificationPermission === "granted" ? "Notifications enabled" : "Enable notifications"}</button>
          </section>
          <section className="card-flat" style={{ padding: "1.35rem", display: "flex", gap: 12 }}><Globe2 color="var(--primary)" /><div><strong>Data services</strong><div className="muted">Firebase Spark Firestore · Vercel Blob Hobby · OpenStreetMap</div></div></section>
        </div>
      </div>
    </AppShell>
  );
}

export default function SettingsPage() { return <ProtectedPage><SettingsContent /></ProtectedPage>; }
