import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { validateResume } from "@/lib/jobs";
import { parseProfile } from "@/lib/matching/evaluator";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    // Reject oversized requests before materializing multipart data where length is available.
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 11 * 1024 * 1024)
      return Response.json(
        { error: "The request exceeds the 10 MB file limit." },
        { status: 413 },
      );
    const form = await request.formData();
    const file = form.get("resume");
    if (!(file instanceof File))
      return Response.json({ error: "Choose a resume file." }, { status: 400 });
    const problem = validateResume(file);
    if (problem) return Response.json({ error: problem }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    let text = "";
    if (/\.pdf$/i.test(file.name)) {
      if (bytes.subarray(0, 5).toString() !== "%PDF-")
        return Response.json(
          { error: "This file is not a valid PDF." },
          { status: 400 },
        );
      const parser = new PDFParse({ data: bytes });
      try {
        text = (await parser.getText()).text;
      } finally {
        await parser.destroy();
      }
    } else {
      if (bytes[0] !== 0x50 || bytes[1] !== 0x4b)
        return Response.json(
          { error: "This file is not a valid DOCX." },
          { status: 400 },
        );
      text = (await mammoth.extractRawText({ buffer: bytes })).value;
    }
    if (!text.trim())
      return Response.json(
        {
          error:
            "No readable text was found. Scanned PDFs require OCR, which this prototype does not provide.",
        },
        { status: 422 },
      );
    if (text.length > 100000)
      return Response.json(
        { error: "This document is too long for the prototype." },
        { status: 422 },
      );
    return Response.json(
      { profile: parseProfile(text) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        error:
          "This document could not be read. Try an unencrypted, text-based PDF or DOCX.",
      },
      { status: 422 },
    );
  }
}
