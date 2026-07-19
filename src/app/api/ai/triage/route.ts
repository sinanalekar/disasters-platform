import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { DEFAULT_AI_SETTINGS } from "@/lib/constants";
import { rulesTriage } from "@/lib/triage";
import { readFirestoreDocument, verifyIdToken } from "@/lib/server/firebase-rest";
import type { AiAssessment, AiSettings } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  description: z.string().min(8).max(5000),
  selectedCategory: z.string().max(60).optional(),
  title: z.string().max(160).optional(),
  mediaUrl: z.string().url().optional(),
  mediaType: z.string().max(100).optional(),
});

const outputSchema = z.object({
  category: z.string(),
  priority: z.enum(["critical", "high", "medium", "low"]),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  reasoning: z.array(z.string()).min(1).max(5),
  requiresHumanReview: z.boolean(),
});

const SYSTEM_PROMPT = `You are a cautious incident-triage assistant for an Indian civic emergency reporting platform.
Return only valid JSON with category, priority, confidence, summary, reasoning, and requiresHumanReview.
Allowed categories: fire, medical, accident, crime, flood, water, electricity, road, sanitation, other.
Priorities: critical only for imminent danger to life or rapidly escalating hazards; high for serious hazards; medium for time-sensitive civic issues; low for routine maintenance.
Never claim to dispatch emergency services. Never reduce a user-marked emergency without human review. Flag uncertainty and critical cases for human review.`;

function authToken(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
}

async function geminiTriage(input: z.infer<typeof requestSchema>, settings: AiSettings): Promise<AiAssessment> {
  if (!process.env.GEMINI_API_KEY) throw new Error("Gemini is not configured");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const parts: Array<Record<string, unknown>> = [
    { text: `${SYSTEM_PROMPT}\n\nTitle: ${input.title || "Not supplied"}\nCitizen-selected category: ${input.selectedCategory || "Not supplied"}\nDescription: ${input.description}` },
  ];

  if (settings.allowImageAnalysis && input.mediaUrl && input.mediaType?.startsWith("image/")) {
    const media = await fetch(input.mediaUrl, { signal: AbortSignal.timeout(8000) });
    if (media.ok && Number(media.headers.get("content-length") || 0) < 8 * 1024 * 1024) {
      const data = Buffer.from(await media.arrayBuffer()).toString("base64");
      parts.push({ inlineData: { data, mimeType: input.mediaType } });
    }
  }

  const response = await ai.models.generateContent({
    model: settings.geminiModel || DEFAULT_AI_SETTINGS.geminiModel,
    contents: [{ role: "user", parts }],
    config: { responseMimeType: "application/json", temperature: 0.1 },
  });
  const parsed = outputSchema.parse(JSON.parse(response.text || "{}"));
  return {
    ...parsed,
    provider: "gemini",
    model: settings.geminiModel,
    requiresHumanReview: parsed.requiresHumanReview || parsed.confidence < settings.confidenceThreshold || (settings.humanReviewCritical && parsed.priority === "critical"),
    processedAt: new Date().toISOString(),
  };
}

async function ollamaTriage(input: z.infer<typeof requestSchema>, settings: AiSettings): Promise<AiAssessment> {
  if (!settings.ollamaBaseUrl) throw new Error("Local AI endpoint is not configured");
  const response = await fetch(`${settings.ollamaBaseUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: settings.ollamaModel,
      stream: false,
      format: "json",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Title: ${input.title || "Not supplied"}\nCitizen category: ${input.selectedCategory || "Not supplied"}\nDescription: ${input.description}` },
      ],
      options: { temperature: 0.1 },
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error(`Local AI returned ${response.status}`);
  const raw = await response.json();
  const parsed = outputSchema.parse(JSON.parse(raw.message?.content || "{}"));
  return {
    ...parsed,
    provider: "ollama",
    model: settings.ollamaModel,
    requiresHumanReview: parsed.requiresHumanReview || parsed.confidence < settings.confidenceThreshold || (settings.humanReviewCritical && parsed.priority === "critical"),
    processedAt: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  const token = authToken(request);
  try {
    await verifyIdToken(token);
    const input = requestSchema.parse(await request.json());
    const settings = {
      ...DEFAULT_AI_SETTINGS,
      ...((await readFirestoreDocument<Partial<AiSettings>>("settings/ai", token)) || {}),
    } as AiSettings;
    let assessment: AiAssessment;
    try {
      assessment = settings.provider === "ollama"
        ? await ollamaTriage(input, settings)
        : settings.provider === "rules"
          ? rulesTriage(input.description, input.selectedCategory)
          : await geminiTriage(input, settings);
    } catch (providerError) {
      console.error("Configured AI failed; using rules", providerError);
      assessment = rulesTriage(input.description, input.selectedCategory);
      assessment.reasoning.push("The configured AI provider was unavailable, so the offline safety rules completed triage.");
    }
    return Response.json(assessment);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to triage incident";
    return Response.json({ error: message }, { status: message.includes("authentication") ? 401 : 400 });
  }
}
