import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { verifyIdToken } from "@/lib/server/firebase-rest";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const user = await verifyIdToken(clientPayload || "");
        const safeName = pathname.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);
        if (!safeName) throw new Error("Invalid filename");
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"],
          maximumSizeInBytes: 20 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ uid: user.localId }),
          cacheControlMaxAge: 3600,
        };
      },
      onUploadCompleted: async () => undefined,
    });
    return Response.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
