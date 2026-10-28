import { getTrackerStore } from "@/lib/tracker-store/store";
import { readTrackerDataset } from "@/lib/tracker-import";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
function response(data: unknown, status = 200) {
  return Response.json(data, { status, headers });
}
function sameOrigin(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return (
      new URL(origin).host ===
      (request.headers.get("x-forwarded-host") || request.headers.get("host"))
    );
  } catch {
    return false;
  }
}
async function boundedText(request: Request, limit = 50 * 1024 * 1024) {
  const size = Number(request.headers.get("content-length") || 0);
  if (size > limit) throw new Error("Import exceeds the 50 MB limit.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing request body.");
  const parts: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new Error("Import exceeds the 50 MB limit.");
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return new TextDecoder().decode(bytes);
}
export async function GET() {
  try {
    return response(getTrackerStore().list());
  } catch {
    return response({ error: "Saved jobs could not be loaded." }, 500);
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return response({ error: "Cross-site requests are not permitted." }, 403);
  try {
    const data = readTrackerDataset(await boundedText(request));
    const summary = getTrackerStore().merge(data);
    return response({ ...getTrackerStore().list(), summary });
  } catch (error) {
    return response(
      { error: error instanceof Error ? error.message : "Import failed." },
      400,
    );
  }
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request))
    return response({ error: "Cross-site requests are not permitted." }, 403);
  try {
    const body = JSON.parse(await boundedText(request, 10000));
    if (typeof body.id !== "string" || typeof body.saved !== "boolean")
      return response({ error: "Invalid saved-job update." }, 400);
    if (!getTrackerStore().setSaved(body.id, body.saved))
      return response({ error: "Job not found." }, 404);
    return response({ ok: true });
  } catch {
    return response({ error: "Unable to save the job." }, 400);
  }
}
