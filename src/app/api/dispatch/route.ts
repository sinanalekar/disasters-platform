import { z } from "zod";
import { readFirestoreDocument, verifyIdToken } from "@/lib/server/firebase-rest";
import type { Authority, Incident, UserProfile } from "@/lib/types";

export const runtime = "nodejs";

const schema = z.object({ incidentId: z.string().min(1).max(200) });

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  try {
    const verified = await verifyIdToken(token);
    const profile = await readFirestoreDocument<UserProfile>(`users/${verified.localId}`, token);
    if (!profile || profile.role === "citizen") return Response.json({ error: "Authority access required" }, { status: 403 });
    const { incidentId } = schema.parse(await request.json());
    const incident = await readFirestoreDocument<Incident>(`incidents/${incidentId}`, token);
    if (!incident) return Response.json({ error: "Incident not found" }, { status: 404 });
    if (!incident.authorityId) return Response.json({ error: "Assign an authority before dispatch" }, { status: 400 });
    const authority = await readFirestoreDocument<Authority>(`authorities/${incident.authorityId}`, token);
    if (!authority?.active) return Response.json({ error: "Assigned authority is inactive" }, { status: 400 });

    const dispatchPayload = {
      event: "incident.dispatched",
      incident: {
        id: incidentId,
        reference: incident.reference,
        title: incident.title,
        description: incident.description,
        category: incident.category,
        priority: incident.priority,
        status: incident.status,
        location: incident.location,
        media: incident.media,
      },
      authority: { id: authority.id, name: authority.name, jurisdiction: authority.jurisdiction },
      dispatchedBy: { id: verified.localId, email: verified.email },
      dispatchedAt: new Date().toISOString(),
    };

    if (authority.dispatchMode === "webhook") {
      if (!authority.webhookUrl) throw new Error("Authority webhook URL is not configured");
      const response = await fetch(authority.webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": "Disasters-Dispatch/1.0" },
        body: JSON.stringify(dispatchPayload),
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error(`Authority webhook returned ${response.status}`);
      return Response.json({ success: true, mode: "webhook", message: `Delivered to ${authority.name}.` });
    }

    if (authority.dispatchMode === "email") {
      if (!authority.email) throw new Error("Authority email is not configured");
      const subject = encodeURIComponent(`[${incident.priority.toUpperCase()}] ${incident.reference} – ${incident.title}`);
      const body = encodeURIComponent(`${incident.description}\n\nLocation: https://www.openstreetmap.org/?mlat=${incident.location.latitude}&mlon=${incident.location.longitude}\nReference: ${incident.reference}`);
      return Response.json({ success: true, mode: "email", actionUrl: `mailto:${authority.email}?subject=${subject}&body=${body}` });
    }

    if (authority.dispatchMode === "phone") {
      if (!authority.phone) throw new Error("Authority phone is not configured");
      return Response.json({ success: true, mode: "phone", actionUrl: `tel:${authority.phone.replace(/[^+\d]/g, "")}` });
    }

    return Response.json({ success: true, mode: "dashboard", message: `${authority.name} receives this report in the live operations dashboard.` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dispatch failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
