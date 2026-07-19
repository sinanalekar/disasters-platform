import "server-only";
import { firebaseApiKey, firebaseProjectId } from "../firebase-config";

export interface VerifiedUser {
  localId: string;
  email?: string;
  displayName?: string;
}

export async function verifyIdToken(idToken: string): Promise<VerifiedUser> {
  if (!idToken) throw new Error("Missing authentication token");
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Invalid or expired authentication token");
  const data = await response.json();
  if (!data.users?.[0]) throw new Error("Unknown Firebase user");
  return data.users[0] as VerifiedUser;
}

function decodeValue(value: Record<string, unknown>): unknown {
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) {
    const raw = value.arrayValue as { values?: Record<string, unknown>[] };
    return (raw.values || []).map(decodeValue);
  }
  if ("mapValue" in value) {
    const raw = value.mapValue as { fields?: Record<string, Record<string, unknown>> };
    return Object.fromEntries(Object.entries(raw.fields || {}).map(([key, item]) => [key, decodeValue(item)]));
  }
  return undefined;
}

export async function readFirestoreDocument<T>(path: string, idToken: string): Promise<T | null> {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/${path}`,
    { headers: { authorization: `Bearer ${idToken}` }, cache: "no-store" }
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Unable to read ${path}`);
  const data = await response.json();
  return Object.fromEntries(
    Object.entries(data.fields || {}).map(([key, value]) => [key, decodeValue(value as Record<string, unknown>)])
  ) as T;
}
