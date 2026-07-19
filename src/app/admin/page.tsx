"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bot,
  Building2,
  Check,
  ClipboardList,
  FileClock,
  KeyRound,
  LayoutDashboard,
  Palette,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
  Webhook,
  X,
} from "lucide-react";
import clsx from "clsx";
import { AppShell, ProtectedPage } from "@/components/app-shell";
import { PageHeader, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import {
  ALL_PERMISSIONS,
  CATEGORIES,
  DEFAULT_AI_SETTINGS,
  LOCAL_AI_MODELS,
  ROLE_DEFAULT_PERMISSIONS,
  ROLE_LABELS,
  SUPER_ADMIN_EMAIL,
  THEMES,
} from "@/lib/constants";
import { db } from "@/lib/firebase";
import { useTheme } from "@/lib/theme-context";
import type { AiSettings, Authority, Permission, ThemeId, UserProfile, UserRole } from "@/lib/types";

type AdminTab = "overview" | "access" | "authorities" | "ai" | "themes" | "system" | "audit";

interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt?: { toDate: () => Date };
}

interface SystemSettings {
  emergencyNumber: string;
  defaultCity: string;
  publicRegistration: boolean;
  criticalSlaMinutes: number;
  highSlaMinutes: number;
  mediumSlaMinutes: number;
  lowSlaMinutes: number;
  maxUploadMb: number;
  apkUrl: string;
  maintenanceMode: boolean;
}

const DEFAULT_SYSTEM: SystemSettings = {
  emergencyNumber: "112",
  defaultCity: "India",
  publicRegistration: true,
  criticalSlaMinutes: 5,
  highSlaMinutes: 15,
  mediumSlaMinutes: 60,
  lowSlaMinutes: 1440,
  maxUploadMb: 20,
  apkUrl: "https://github.com/sinanalekar/disasters-platform/releases/latest/download/Disasters.apk",
  maintenanceMode: false,
};

const EMPTY_AUTHORITY: Omit<Authority, "id"> = {
  name: "",
  type: "municipality",
  jurisdiction: "",
  categories: [],
  phone: "",
  email: "",
  website: "",
  webhookUrl: "",
  dispatchMode: "dashboard",
  escalationMinutes: 15,
  active: true,
  verified: false,
};

const tabs: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "access", label: "Access control", icon: UserCog },
  { id: "authorities", label: "Authorities", icon: Building2 },
  { id: "ai", label: "AI models", icon: Bot },
  { id: "themes", label: "Themes", icon: Palette },
  { id: "system", label: "System", icon: Settings2 },
  { id: "audit", label: "Audit log", icon: FileClock },
];

function AdminConsole() {
  const { user, profile } = useAuth();
  const { theme, setPreviewTheme } = useTheme();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [incidentsCount, setIncidentsCount] = useState(0);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [aiSettings, setAiSettings] = useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [themeSetting, setThemeSetting] = useState<ThemeId>(theme);
  const [system, setSystem] = useState<SystemSettings>(DEFAULT_SYSTEM);
  const [authorityForm, setAuthorityForm] = useState<Omit<Authority, "id"> & { id?: string }>(EMPTY_AUTHORITY);
  const [showAuthorityForm, setShowAuthorityForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("dispatcher");
  const [invitePermissions, setInvitePermissions] = useState<Permission[]>(ROLE_DEFAULT_PERMISSIONS.dispatcher);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [aiTest, setAiTest] = useState("");

  useEffect(() => {
    const unsubs = [
      onSnapshot(collection(db, "users"), (snapshot) => {
        const profiles = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as UserProfile);
        setUsers(profiles);
        setLoading(false);
      }),
      onSnapshot(collection(db, "authorities"), (snapshot) => {
        const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Authority);
        setAuthorities(items);
      }),
      onSnapshot(collection(db, "incidents"), (snapshot) => setIncidentsCount(snapshot.size)),
      onSnapshot(doc(db, "settings", "ai"), (snapshot) => {
        if (snapshot.exists()) setAiSettings({ ...DEFAULT_AI_SETTINGS, ...snapshot.data() } as AiSettings);
      }),
      onSnapshot(doc(db, "settings", "theme"), (snapshot) => {
        if (snapshot.exists()) setThemeSetting((snapshot.data().defaultTheme as ThemeId) || "command");
      }),
      onSnapshot(doc(db, "settings", "system"), (snapshot) => {
        if (snapshot.exists()) setSystem({ ...DEFAULT_SYSTEM, ...snapshot.data() } as SystemSettings);
      }),
      onSnapshot(
        query(collection(db, "auditLogs"), orderBy("createdAt", "desc"), limit(100)),
        (snapshot) => {
          const logs = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as AuditLog);
          setAuditLogs(logs);
        },
      ),
    ];
    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, []);

  const can = (permission: Permission) => profile?.role === "super_admin" || user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL || profile?.permissions?.includes(permission);

  async function audit(action: string, targetType: string, targetId: string, details: string) {
    if (!user || !profile) return;
    await addDoc(collection(db, "auditLogs"), { actorId: user.uid, actorName: profile.displayName, action, targetType, targetId, details, createdAt: serverTimestamp() });
  }

  function success(message: string) { setNotice(message); setError(""); window.setTimeout(() => setNotice(""), 3500); }
  function fail(err: unknown) { setError(err instanceof Error ? err.message : "The operation failed."); }

  async function invite(event: FormEvent) {
    event.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    try {
      await setDoc(doc(db, "adminInvites", email), { email, role: inviteRole, permissions: invitePermissions, invitedBy: user?.uid, invitedAt: serverTimestamp(), status: "pending" });
      await audit("access.invited", "email", email, `${ROLE_LABELS[inviteRole]} invitation created.`);
      setInviteEmail(""); success(`Invitation access prepared for ${email}. They can now continue with that Google account.`);
    } catch (err) { fail(err); }
  }

  async function updateRole(target: UserProfile, role: UserRole) {
    if (target.email === SUPER_ADMIN_EMAIL && role !== "super_admin") { setError("The bootstrap super administrator cannot be demoted."); return; }
    try {
      await updateDoc(doc(db, "users", target.id), { role, permissions: ROLE_DEFAULT_PERMISSIONS[role], updatedAt: serverTimestamp() });
      await audit("access.role_changed", "user", target.id, `${target.email}: ${target.role} → ${role}`); success("Role updated.");
    } catch (err) { fail(err); }
  }

  async function toggleUser(target: UserProfile) {
    if (target.email === SUPER_ADMIN_EMAIL) { setError("The bootstrap super administrator cannot be suspended."); return; }
    try { await updateDoc(doc(db, "users", target.id), { disabled: !target.disabled, updatedAt: serverTimestamp() }); await audit("access.status_changed", "user", target.id, `${target.email}: ${target.disabled ? "enabled" : "suspended"}`); success("Account access updated."); } catch (err) { fail(err); }
  }

  async function togglePermission(target: UserProfile, permission: Permission) {
    const permissions = target.permissions?.includes(permission) ? target.permissions.filter((item) => item !== permission) : [...(target.permissions || []), permission];
    try { await updateDoc(doc(db, "users", target.id), { permissions, updatedAt: serverTimestamp() }); await audit("access.permissions_changed", "user", target.id, `${target.email}: ${permission}`); } catch (err) { fail(err); }
  }

  async function saveAuthority(event: FormEvent) {
    event.preventDefault();
    try {
      const payload = { ...authorityForm, updatedAt: serverTimestamp() };
      if (authorityForm.id) await updateDoc(doc(db, "authorities", authorityForm.id), payload);
      else await addDoc(collection(db, "authorities"), { ...payload, createdAt: serverTimestamp() });
      await audit(authorityForm.id ? "authority.updated" : "authority.created", "authority", authorityForm.id || authorityForm.name, `${authorityForm.name} · ${authorityForm.dispatchMode}`);
      setAuthorityForm(EMPTY_AUTHORITY); setShowAuthorityForm(false); success("Authority configuration saved.");
    } catch (err) { fail(err); }
  }

  async function removeAuthority(authority: Authority) {
    if (!confirm(`Delete ${authority.name}? Existing incident history will retain its name.`)) return;
    try { await deleteDoc(doc(db, "authorities", authority.id)); await audit("authority.deleted", "authority", authority.id, authority.name); success("Authority removed."); } catch (err) { fail(err); }
  }

  async function saveAi() {
    try { await setDoc(doc(db, "settings", "ai"), { ...aiSettings, updatedAt: serverTimestamp(), updatedBy: user?.uid }); await audit("settings.ai_updated", "settings", "ai", `${aiSettings.provider}: ${aiSettings.provider === "ollama" ? aiSettings.ollamaModel : aiSettings.geminiModel}`); success("AI configuration saved."); } catch (err) { fail(err); }
  }

  async function testAi() {
    if (!user) return;
    setAiTest("Testing…");
    try {
      await saveAi();
      const response = await fetch("/api/ai/triage", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ title: "Model test", selectedCategory: "other", description: "Dense smoke and visible flames are coming from a residential building. People may be trapped inside." }) });
      const result = await response.json();
      setAiTest(response.ok ? `${result.provider}/${result.model}: ${result.category}, ${result.priority}, ${Math.round(result.confidence * 100)}% confidence` : result.error);
    } catch (err) { setAiTest(err instanceof Error ? err.message : "Test failed"); }
  }

  async function saveTheme() {
    try { await setDoc(doc(db, "settings", "theme"), { defaultTheme: themeSetting, updatedAt: serverTimestamp(), updatedBy: user?.uid }); await audit("settings.theme_updated", "settings", "theme", themeSetting); setPreviewTheme(null); success("Default theme applied to everyone."); } catch (err) { fail(err); }
  }

  async function saveSystem() {
    try { await setDoc(doc(db, "settings", "system"), { ...system, updatedAt: serverTimestamp(), updatedBy: user?.uid }); await audit("settings.system_updated", "settings", "system", `Emergency ${system.emergencyNumber}; city ${system.defaultCity}`); success("System settings saved."); } catch (err) { fail(err); }
  }

  const activeStaff = useMemo(() => users.filter((item) => item.role !== "citizen" && !item.disabled).length, [users]);

  if (loading) return <AppShell><Spinner label="Loading admin console" /></AppShell>;

  return (
    <AppShell>
      <PageHeader eyebrow="/admin · Protected" title="Administration & governance" description="Control system access, operational routing, AI, default appearance and safety settings. Every change is audited." action={<span className="badge"><ShieldCheck size={15} /> {profile ? ROLE_LABELS[profile.role] : "Administrator"}</span>} />
      {notice && <div className="alert" role="status" style={{ marginBottom: 14 }}><Check size={17} style={{ display: "inline", verticalAlign: "-3px", marginRight: 6 }} />{notice}</div>}
      {error && <div className="alert alert-danger" role="alert" style={{ marginBottom: 14 }}><X size={17} style={{ display: "inline", verticalAlign: "-3px", marginRight: 6 }} />{error}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "230px minmax(0,1fr)", gap: 18, alignItems: "start" }} className="admin-layout">
        <nav className="card" aria-label="Admin sections" style={{ padding: 8, position: "sticky", top: 96 }}>
          {tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={clsx("btn btn-ghost", tab === id && "admin-active")} style={{ width: "100%", justifyContent: "flex-start", background: tab === id ? "var(--primary-soft)" : "transparent", color: tab === id ? "var(--primary)" : "var(--text)" }}><Icon size={18} /> {label}</button>)}
        </nav>
        <div>
          {tab === "overview" && <section>
            <div className="grid-3" style={{ marginBottom: 16 }}>{[
              [Users, "Registered users", users.length], [KeyRound, "Active staff", activeStaff], [Building2, "Active authorities", authorities.filter((a) => a.active).length], [ClipboardList, "All incidents", incidentsCount], [Bot, "AI provider", aiSettings.provider], [Palette, "Default theme", themeSetting],
            ].map(([Icon, label, value]) => { const StatIcon = Icon as typeof Users; return <div className="card-flat" key={String(label)} style={{ padding: "1.15rem", display: "flex", justifyContent: "space-between", gap: 12 }}><div><span className="muted">{String(label)}</span><strong style={{ display: "block", fontSize: typeof value === "number" ? "2rem" : "1.1rem", textTransform: "capitalize" }}>{String(value)}</strong></div><StatIcon color="var(--primary)" /></div>; })}</div>
            <div className="card" style={{ padding: "1.4rem" }}><div className="eyebrow">Governance status</div><h2 style={{ margin: ".25rem 0 1rem" }}>Platform controls</h2><div className="grid-2">{[
              ["Bootstrap administrator", SUPER_ADMIN_EMAIL], ["Firestore project", "civicshield-india-sinan"], ["Media storage", "Vercel Blob Hobby"], ["Emergency number", system.emergencyNumber], ["Critical response target", `${system.criticalSlaMinutes} minutes`], ["Maintenance mode", system.maintenanceMode ? "Enabled" : "Disabled"],
            ].map(([label, value]) => <div key={label} className="card-flat" style={{ padding: ".85rem" }}><div className="muted" style={{ fontSize: ".8rem" }}>{label}</div><strong>{value}</strong></div>)}</div></div>
          </section>}

          {tab === "access" && <section className="card" style={{ padding: "1.3rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}><div><div className="eyebrow">Roles & permissions</div><h2 style={{ margin: ".25rem 0" }}>Access control</h2></div><UserCog color="var(--primary)" /></div>
            <form onSubmit={invite} className="card-flat" style={{ padding: "1rem", display: "grid", gap: 12, margin: "1rem 0" }}>
              <strong>Invite or pre-authorize an email</strong>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 200px auto", gap: 8 }}><input className="input" type="email" placeholder="person@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required /><select className="select" value={inviteRole} onChange={(e) => { const role = e.target.value as UserRole; setInviteRole(role); setInvitePermissions(ROLE_DEFAULT_PERMISSIONS[role]); }}>{Object.entries(ROLE_LABELS).filter(([id]) => id !== "citizen" && id !== "super_admin").map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><button className="btn btn-primary" disabled={!can("manage_roles")}><Plus size={16} /> Authorize</button></div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{ALL_PERMISSIONS.map((permission) => <label key={permission.id} className="badge" style={{ cursor: "pointer" }}><input type="checkbox" checked={invitePermissions.includes(permission.id)} onChange={() => setInvitePermissions(invitePermissions.includes(permission.id) ? invitePermissions.filter((item) => item !== permission.id) : [...invitePermissions, permission.id])} /> {permission.label}</label>)}</div>
            </form>
            <div className="table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Fine-grained permissions</th><th>Access</th></tr></thead><tbody>{users.map((target) => <tr key={target.id}><td><strong>{target.displayName}</strong><div className="muted" style={{ fontSize: ".78rem" }}>{target.email}</div>{target.email === SUPER_ADMIN_EMAIL && <span className="badge">Bootstrap owner</span>}</td><td><select className="select" value={target.role} onChange={(e) => updateRole(target, e.target.value as UserRole)} disabled={!can("manage_roles") || target.email === SUPER_ADMIN_EMAIL}>{Object.entries(ROLE_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></td><td><details><summary className="btn btn-secondary" style={{ minHeight: 34, padding: ".35rem .55rem" }}>{target.permissions?.length || 0} permissions</summary><div style={{ display: "grid", gap: 4, paddingTop: 8 }}>{ALL_PERMISSIONS.map((permission) => <label key={permission.id} style={{ fontSize: ".82rem" }}><input type="checkbox" checked={target.permissions?.includes(permission.id) || target.role === "super_admin"} disabled={!can("manage_roles") || target.role === "super_admin"} onChange={() => togglePermission(target, permission.id)} /> {permission.label}</label>)}</div></details></td><td><button className={target.disabled ? "btn btn-primary" : "btn btn-secondary"} onClick={() => toggleUser(target)} disabled={!can("manage_roles") || target.email === SUPER_ADMIN_EMAIL}>{target.disabled ? "Restore" : "Suspend"}</button></td></tr>)}</tbody></table></div>
          </section>}

          {tab === "authorities" && <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}><div><div className="eyebrow">Configurable dispatch</div><h2 style={{ margin: ".25rem 0" }}>Authorities & jurisdictions</h2></div><button className="btn btn-primary" onClick={() => { setAuthorityForm(EMPTY_AUTHORITY); setShowAuthorityForm(!showAuthorityForm); }} disabled={!can("manage_authorities")}><Plus size={17} /> Add authority</button></div>
            {showAuthorityForm && <form onSubmit={saveAuthority} className="card" style={{ padding: "1.25rem", display: "grid", gap: 12, marginBottom: 14 }}><div className="grid-2"><label className="field"><span className="label">Department name</span><input className="input" value={authorityForm.name} onChange={(e) => setAuthorityForm({ ...authorityForm, name: e.target.value })} required /></label><label className="field"><span className="label">Jurisdiction</span><input className="input" placeholder="India, state, city or ward" value={authorityForm.jurisdiction} onChange={(e) => setAuthorityForm({ ...authorityForm, jurisdiction: e.target.value })} required /></label><label className="field"><span className="label">Department type</span><select className="select" value={authorityForm.type} onChange={(e) => setAuthorityForm({ ...authorityForm, type: e.target.value })}><option value="emergency">Emergency control</option><option value="fire">Fire department</option><option value="police">Police</option><option value="medical">Ambulance/medical</option><option value="municipality">Municipality</option><option value="utility">Utility</option><option value="ngo">NGO/relief</option></select></label><label className="field"><span className="label">Dispatch method</span><select className="select" value={authorityForm.dispatchMode} onChange={(e) => setAuthorityForm({ ...authorityForm, dispatchMode: e.target.value as Authority["dispatchMode"] })}><option value="dashboard">Internal dashboard</option><option value="email">Email handoff</option><option value="webhook">API/webhook</option><option value="phone">Phone call</option></select></label><label className="field"><span className="label">Phone</span><input className="input" value={authorityForm.phone} onChange={(e) => setAuthorityForm({ ...authorityForm, phone: e.target.value })} /></label><label className="field"><span className="label">Email</span><input className="input" type="email" value={authorityForm.email} onChange={(e) => setAuthorityForm({ ...authorityForm, email: e.target.value })} /></label><label className="field"><span className="label">Public website</span><input className="input" type="url" value={authorityForm.website} onChange={(e) => setAuthorityForm({ ...authorityForm, website: e.target.value })} /></label><label className="field"><span className="label">Webhook/API endpoint</span><input className="input" type="url" value={authorityForm.webhookUrl} onChange={(e) => setAuthorityForm({ ...authorityForm, webhookUrl: e.target.value })} /></label><label className="field"><span className="label">Escalate after minutes</span><input className="input" type="number" min="1" value={authorityForm.escalationMinutes} onChange={(e) => setAuthorityForm({ ...authorityForm, escalationMinutes: Number(e.target.value) })} /></label></div><div className="field"><span className="label">Supported incident categories</span><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{CATEGORIES.map((category) => <label key={category.id} className="badge"><input type="checkbox" checked={authorityForm.categories.includes(category.id)} onChange={() => setAuthorityForm({ ...authorityForm, categories: authorityForm.categories.includes(category.id) ? authorityForm.categories.filter((item) => item !== category.id) : [...authorityForm.categories, category.id] })} /> {category.label}</label>)}</div></div><div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}><label><input type="checkbox" checked={authorityForm.active} onChange={(e) => setAuthorityForm({ ...authorityForm, active: e.target.checked })} /> Active</label><label><input type="checkbox" checked={authorityForm.verified} onChange={(e) => setAuthorityForm({ ...authorityForm, verified: e.target.checked })} /> Contact verified</label></div><div style={{ display: "flex", gap: 8 }}><button className="btn btn-primary"><Save size={17} /> Save authority</button><button type="button" className="btn btn-secondary" onClick={() => setShowAuthorityForm(false)}>Cancel</button></div></form>}
            <div style={{ display: "grid", gap: 10 }}>{authorities.map((authority) => <article className="card-flat" key={authority.id} style={{ padding: "1rem", display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}><div><div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><strong>{authority.name}</strong><span className="badge">{authority.type}</span><span className="badge"><Webhook size={13} /> {authority.dispatchMode}</span>{authority.verified && <span className="badge"><Check size={13} /> verified</span>}</div><div className="muted" style={{ marginTop: 5 }}>{authority.jurisdiction} · {authority.categories.join(", ") || "No categories"} · escalation {authority.escalationMinutes}m</div><div style={{ fontSize: ".8rem", marginTop: 4 }}>{authority.phone || "No phone"} · {authority.email || "No email"} · {authority.webhookUrl || authority.website || "No external endpoint"}</div></div><div style={{ display: "flex", gap: 6 }}><button className="btn btn-secondary" onClick={() => { setAuthorityForm(authority); setShowAuthorityForm(true); }}>Edit</button><button className="btn btn-ghost" style={{ color: "var(--danger)" }} onClick={() => removeAuthority(authority)}><Trash2 size={17} /></button></div></article>)}</div>
          </section>}

          {tab === "ai" && <section className="card" style={{ padding: "1.35rem", display: "grid", gap: 16 }}><div style={{ display: "flex", justifyContent: "space-between" }}><div><div className="eyebrow">Triage engine</div><h2 style={{ margin: ".25rem 0" }}>AI provider & model</h2></div><Bot color="var(--primary)" /></div><div className="grid-3">{[
            ["gemini", "Gemini cloud", "Multimodal analysis through the server-side Gemini API key."], ["ollama", "Local Ollama", "Free on-premise models through a configurable secure endpoint."], ["rules", "Safety rules", "Always-available deterministic keyword and escalation rules."],
          ].map(([id, name, desc]) => <label key={id} className="card-flat" style={{ padding: "1rem", cursor: "pointer", borderColor: aiSettings.provider === id ? "var(--primary)" : "var(--border)" }}><input type="radio" name="provider" checked={aiSettings.provider === id} onChange={() => setAiSettings({ ...aiSettings, provider: id as AiSettings["provider"] })} /> <strong>{name}</strong><p className="muted" style={{ margin: ".4rem 0 0", fontSize: ".84rem" }}>{desc}</p></label>)}</div>{aiSettings.provider === "gemini" && <label className="field"><span className="label">Gemini model</span><input className="input" value={aiSettings.geminiModel} onChange={(e) => setAiSettings({ ...aiSettings, geminiModel: e.target.value })} /></label>}{aiSettings.provider === "ollama" && <div className="grid-2"><label className="field"><span className="label">Ollama endpoint</span><input className="input" type="url" value={aiSettings.ollamaBaseUrl} onChange={(e) => setAiSettings({ ...aiSettings, ollamaBaseUrl: e.target.value })} /></label><label className="field"><span className="label">Local model</span><select className="select" value={aiSettings.ollamaModel} onChange={(e) => setAiSettings({ ...aiSettings, ollamaModel: e.target.value })}>{LOCAL_AI_MODELS.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>{LOCAL_AI_MODELS.map((model) => model.id === aiSettings.ollamaModel && <div key={model.id} className="alert" style={{ gridColumn: "1/-1" }}>{model.note} Install with: <code>ollama pull {model.id}</code></div>)}</div>}<div className="grid-2"><label className="field"><span className="label">Confidence threshold: {Math.round(aiSettings.confidenceThreshold * 100)}%</span><input type="range" min="0.5" max="0.95" step="0.01" value={aiSettings.confidenceThreshold} onChange={(e) => setAiSettings({ ...aiSettings, confidenceThreshold: Number(e.target.value) })} /></label><div style={{ display: "grid", gap: 6 }}><label><input type="checkbox" checked={aiSettings.allowImageAnalysis} onChange={(e) => setAiSettings({ ...aiSettings, allowImageAnalysis: e.target.checked })} /> Allow image analysis</label><label><input type="checkbox" checked={aiSettings.humanReviewCritical} onChange={(e) => setAiSettings({ ...aiSettings, humanReviewCritical: e.target.checked })} /> Always human-review critical reports</label></div></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button className="btn btn-primary" onClick={saveAi} disabled={!can("manage_settings")}><Save size={17} /> Save AI settings</button><button className="btn btn-secondary" onClick={testAi}>Test selected model</button></div>{aiTest && <div className="alert">{aiTest}</div>}</section>}

          {tab === "themes" && <section><div className="eyebrow">Organization appearance</div><h2 style={{ margin: ".25rem 0" }}>Default theme for everyone</h2><p className="muted">Themes use accessible functional colours inspired by established medical, government and disaster-response design systems. Status always includes labels and icons, never colour alone.</p><div className="grid-2" style={{ marginBlock: 16 }}>{THEMES.map((item) => <button key={item.id} className="card-flat" onClick={() => { setThemeSetting(item.id); setPreviewTheme(item.id); }} style={{ padding: "1.2rem", textAlign: "left", border: `2px solid ${themeSetting === item.id ? "var(--primary)" : "var(--border)"}` }}><div style={{ display: "flex", justifyContent: "space-between" }}><strong>{item.name}</strong>{themeSetting === item.id && <Check size={19} color="var(--primary)" />}</div><p className="muted">{item.description}</p><div style={{ display: "flex", gap: 6 }}>{item.swatches.map((colour) => <span key={colour} title={colour} style={{ width: 32, height: 32, borderRadius: 8, background: colour, border: "1px solid #777" }} />)}</div></button>)}</div><button className="btn btn-primary" onClick={saveTheme} disabled={!can("manage_settings")}><Palette size={17} /> Apply as global default</button></section>}

          {tab === "system" && <section className="card" style={{ padding: "1.35rem", display: "grid", gap: 16 }}><div style={{ display: "flex", justifyContent: "space-between" }}><div><div className="eyebrow">Core configuration</div><h2 style={{ margin: ".25rem 0" }}>System & safety settings</h2></div><Settings2 color="var(--primary)" /></div><div className="grid-2"><label className="field"><span className="label">Emergency number</span><input className="input" value={system.emergencyNumber} onChange={(e) => setSystem({ ...system, emergencyNumber: e.target.value })} /></label><label className="field"><span className="label">Default city/region</span><input className="input" value={system.defaultCity} onChange={(e) => setSystem({ ...system, defaultCity: e.target.value })} /></label><label className="field"><span className="label">Critical SLA minutes</span><input className="input" type="number" min="1" value={system.criticalSlaMinutes} onChange={(e) => setSystem({ ...system, criticalSlaMinutes: Number(e.target.value) })} /></label><label className="field"><span className="label">High SLA minutes</span><input className="input" type="number" min="1" value={system.highSlaMinutes} onChange={(e) => setSystem({ ...system, highSlaMinutes: Number(e.target.value) })} /></label><label className="field"><span className="label">Medium SLA minutes</span><input className="input" type="number" min="1" value={system.mediumSlaMinutes} onChange={(e) => setSystem({ ...system, mediumSlaMinutes: Number(e.target.value) })} /></label><label className="field"><span className="label">Low SLA minutes</span><input className="input" type="number" min="1" value={system.lowSlaMinutes} onChange={(e) => setSystem({ ...system, lowSlaMinutes: Number(e.target.value) })} /></label><label className="field"><span className="label">Maximum upload MB</span><input className="input" type="number" min="1" max="20" value={system.maxUploadMb} onChange={(e) => setSystem({ ...system, maxUploadMb: Number(e.target.value) })} /></label><label className="field"><span className="label">Android APK download URL</span><input className="input" type="url" value={system.apkUrl} onChange={(e) => setSystem({ ...system, apkUrl: e.target.value })} /></label></div><div style={{ display: "grid", gap: 8 }}><label><input type="checkbox" checked={system.publicRegistration} onChange={(e) => setSystem({ ...system, publicRegistration: e.target.checked })} /> Allow public citizen registration</label><label><input type="checkbox" checked={system.maintenanceMode} onChange={(e) => setSystem({ ...system, maintenanceMode: e.target.checked })} /> Maintenance mode banner</label></div><button className="btn btn-primary" onClick={saveSystem} disabled={!can("manage_settings")}><Save size={17} /> Save system settings</button></section>}

          {tab === "audit" && <section className="card" style={{ padding: "1.3rem" }}><div style={{ display: "flex", justifyContent: "space-between" }}><div><div className="eyebrow">Immutable history</div><h2 style={{ margin: ".25rem 0" }}>Administrator audit log</h2></div><Activity color="var(--primary)" /></div><div className="table-wrap"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th></tr></thead><tbody>{auditLogs.map((log) => <tr key={log.id}><td>{log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : "Pending"}</td><td>{log.actorName}</td><td><code>{log.action}</code></td><td>{log.targetType}/{log.targetId}</td><td>{log.details}</td></tr>)}</tbody></table></div></section>}
        </div>
      </div>
      <style jsx>{`@media (max-width: 900px){ .admin-layout{ grid-template-columns: 1fr !important; } nav.card{ position: static !important; display:flex; overflow-x:auto; } nav.card button{ width:auto !important; white-space:nowrap; } } @media (max-width:720px){ form.card-flat > div:first-of-type{grid-template-columns:1fr !important;} }`}</style>
    </AppShell>
  );
}

export default function AdminPage() {
  return <ProtectedPage adminOnly><AdminConsole /></ProtectedPage>;
}
