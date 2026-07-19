import type { AiSettings, IncidentStatus, Permission, Priority, ThemeId, UserRole } from "./types";

export const APP_NAME = "Disasters";
export const SUPER_ADMIN_EMAIL = "sinanalekar9192@gmail.com";
export const APK_DOWNLOAD_URL =
  "https://github.com/sinanalekar/disasters-platform/releases/latest/download/Disasters.apk";

export const CATEGORIES = [
  { id: "fire", label: "Fire & smoke", icon: "Flame", defaultPriority: "critical" as Priority },
  { id: "medical", label: "Medical emergency", icon: "HeartPulse", defaultPriority: "critical" as Priority },
  { id: "accident", label: "Road accident", icon: "Car", defaultPriority: "high" as Priority },
  { id: "crime", label: "Crime or safety threat", icon: "ShieldAlert", defaultPriority: "high" as Priority },
  { id: "flood", label: "Flood or waterlogging", icon: "Waves", defaultPriority: "high" as Priority },
  { id: "water", label: "Water leakage", icon: "Droplets", defaultPriority: "medium" as Priority },
  { id: "electricity", label: "Electrical hazard", icon: "Zap", defaultPriority: "high" as Priority },
  { id: "road", label: "Road or pothole", icon: "Construction", defaultPriority: "low" as Priority },
  { id: "sanitation", label: "Sanitation or waste", icon: "Trash2", defaultPriority: "low" as Priority },
  { id: "other", label: "Other civic issue", icon: "CircleHelp", defaultPriority: "medium" as Priority },
];

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  assigned: "Assigned",
  acknowledged: "Acknowledged",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
  rejected: "Rejected",
  duplicate: "Duplicate",
  cancelled: "Cancelled",
};

export const STATUS_FLOW: IncidentStatus[] = [
  "submitted",
  "under_review",
  "assigned",
  "acknowledged",
  "in_progress",
  "resolved",
  "closed",
];

export const ROLE_LABELS: Record<UserRole, string> = {
  citizen: "Citizen",
  field_responder: "Field responder",
  dispatcher: "Dispatcher",
  supervisor: "Supervisor",
  admin: "Administrator",
  super_admin: "Super administrator",
};

export const ALL_PERMISSIONS: { id: Permission; label: string }[] = [
  { id: "view_all_incidents", label: "View all incidents" },
  { id: "assign_incidents", label: "Assign incidents" },
  { id: "update_incidents", label: "Update incidents" },
  { id: "delete_incidents", label: "Delete incidents" },
  { id: "manage_authorities", label: "Manage authorities and dispatch" },
  { id: "manage_roles", label: "Manage users, roles and access" },
  { id: "manage_settings", label: "Manage AI, themes and system settings" },
  { id: "view_audit_logs", label: "View audit logs" },
  { id: "export_data", label: "Export operational data" },
];

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
  citizen: [],
  field_responder: ["view_all_incidents", "update_incidents"],
  dispatcher: ["view_all_incidents", "assign_incidents", "update_incidents"],
  supervisor: ["view_all_incidents", "assign_incidents", "update_incidents", "export_data"],
  admin: ALL_PERMISSIONS.filter((p) => p.id !== "delete_incidents").map((p) => p.id),
  super_admin: ALL_PERMISSIONS.map((p) => p.id),
};

export const THEMES: { id: ThemeId; name: string; description: string; swatches: string[] }[] = [
  {
    id: "command",
    name: "Command centre",
    description: "Deep navy, teal and orange derived from the Disasters identity.",
    swatches: ["#073b67", "#007f8b", "#f05a28", "#f7fafc"],
  },
  {
    id: "medical",
    name: "Medical clean",
    description: "Accessible blue, white and green for calm clinical clarity.",
    swatches: ["#005eb8", "#007f3b", "#d8e8f5", "#ffffff"],
  },
  {
    id: "disaster",
    name: "Disaster response",
    description: "Urgent red with navy and white for crisis operations.",
    swatches: ["#c1121f", "#14213d", "#f4a261", "#ffffff"],
  },
  {
    id: "high-contrast",
    name: "High contrast",
    description: "Black, white and safety yellow for maximum visual accessibility.",
    swatches: ["#000000", "#ffdd00", "#ffffff", "#005ea8"],
  },
];

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: "gemini",
  geminiModel: "gemini-3.5-flash",
  ollamaModel: "llama3.2:3b",
  ollamaBaseUrl: "http://localhost:11434",
  confidenceThreshold: 0.72,
  allowImageAnalysis: true,
  humanReviewCritical: true,
};

export const LOCAL_AI_MODELS = [
  { id: "llama3.2:3b", name: "Llama 3.2 3B", note: "Fast multilingual triage; supports Hindi." },
  { id: "gemma3:4b", name: "Gemma 3 4B", note: "Strong compact reasoning and multilingual support." },
  { id: "qwen2.5:3b", name: "Qwen 2.5 3B", note: "Efficient structured classification on modest hardware." },
];
