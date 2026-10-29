import { getTrackerStore } from "@/lib/tracker-store/store";
import {
  evaluateWithCodex,
  EvaluationFailure,
  UnverifiableResponse,
  investigation,
} from "@/lib/matching/codex";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
let busy = false;
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if (
    (site && site !== "same-origin") ||
    (!site &&
      (!origin ||
        new URL(origin).host !==
          (request.headers.get("x-forwarded-host") ||
            request.headers.get("host"))))
  )
    return Response.json(
      { error: "Same-origin requests required." },
      { status: 403, headers },
    );
  if (busy)
    return Response.json(
      { error: "Another evaluation is running. Please retry." },
      { status: 429, headers },
    );
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error();
    let body = "",
      size = 0;
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 450000) {
        await reader.cancel();
        throw new Error();
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    const data = JSON.parse(body);
    if (
      typeof data.resume !== "string" ||
      !data.resume.trim() ||
      data.resume.length > 100000 ||
      typeof data.id !== "string" ||
      (data.model !== undefined &&
        data.model !== "fast" &&
        data.model !== "standard")
    )
      throw new Error();
    const job = getTrackerStore()
      .list()
      .jobs.find((job) => job.id === data.id);
    if (!job)
      return Response.json(
        { error: "Imported job not found." },
        { status: 404, headers },
      );
    if (job.descriptions.reduce((n, d) => n + d.text.length, 0) > 100000)
      return Response.json(
        {
          assessment: {
            status: "Investigate",
            reason:
              "Description exceeds the evaluation text limit; review the original source.",
            rows: [],
          },
        },
        { headers },
      );
    if (busy)
      return Response.json(
        { error: "Another evaluation is running. Please retry." },
        { status: 429, headers },
      );
    busy = true;
    try {
      return Response.json(
        {
          assessment: await evaluateWithCodex(
            data.resume,
            job,
            request.signal,
            data.model || "standard",
          ),
        },
        { headers },
      );
    } catch (error) {
      if (error instanceof UnverifiableResponse) {
        return Response.json(
          {
            assessment: investigation(
              `The model response could not be verified (${["Invalid evaluation", "Unsupported compensation", "Unsupported evidence", "Malformed model response"].find((category) => error.message === `The model response could not be verified (${category}). No verdict was guessed.`) || "Unknown verification issue"}). No verdict was guessed.`,
            ),
            verificationIssue: true,
          },
          { headers },
        );
      }
      return Response.json(
        {
          error:
            error instanceof EvaluationFailure
              ? error.message
              : "Codex could not complete this evaluation. No verdict was guessed.",
        },
        { status: 503, headers },
      );
    } finally {
      busy = false;
    }
  } catch {
    return Response.json(
      { error: "Invalid evaluation request." },
      { status: 400, headers },
    );
  }
}
