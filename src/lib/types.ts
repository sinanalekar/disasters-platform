import type { Timestamp } from "firebase/firestore";

export type UserRole =
  | "citizen"
  | "field_responder"
  | "dispatcher"
  | "supervisor"
  | "admin"
  | "super_admin";

export type Permission =
  | "view_all_incidents"
  | "assign_incidents"
  | "update_incidents"
  | "delete_incidents"
  | "manage_authorities"
  | "manage_roles"
  | "manage_settings"
  | "view_audit_logs"
  | "export_data";

export type IncidentStatus =
  | "submitted"
  | "under_review"
  | "assigned"
  | "acknowledged"
  | "in_progress"
  | "resolved"
  | "closed"
  | "rejected"
  | "duplicate"
  | "cancelled";

export type Priority = "critical" | "high" | "medium" | "low";

export type ThemeId = "command" | "medical" | "disaster" | "high-contrast";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  phone?: string;
  role: UserRole;
  permissions: Permission[];
  authorityId?: string;
  disabled: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface MediaAttachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
}

export interface AiAssessment {
  provider: string;
  model: string;
  category: string;
  priority: Priority;
  confidence: number;
  summary: string;
  reasoning: string[];
  requiresHumanReview: boolean;
  processedAt: string;
}

export interface Incident {
  id: string;
  reference: string;
  reporterId: string;
  reporterName: string;
  reporterEmail: string;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: IncidentStatus;
  location: GeoLocation;
  media: MediaAttachment[];
  ai?: AiAssessment;
  authorityId?: string;
  authorityName?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  resolutionNote?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  resolvedAt?: Timestamp;
}

export interface Authority {
  id: string;
  name: string;
  type: string;
  jurisdiction: string;
  categories: string[];
  phone?: string;
  email?: string;
  website?: string;
  webhookUrl?: string;
  dispatchMode: "dashboard" | "email" | "webhook" | "phone";
  escalationMinutes: number;
  active: boolean;
  verified: boolean;
}

export interface AiSettings {
  provider: "gemini" | "ollama" | "rules";
  geminiModel: string;
  ollamaModel: string;
  ollamaBaseUrl: string;
  confidenceThreshold: number;
  allowImageAnalysis: boolean;
  humanReviewCritical: boolean;
}

export interface Message {
  id: string;
  incidentId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  createdAt?: Timestamp;
}
