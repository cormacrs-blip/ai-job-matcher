export class UploadTooLarge extends Error {}

/** Bound the actual stream before multipart parsing, even without Content-Length. */
export async function readResumeForm(
  request: Request,
  limit = 11 * 1024 * 1024,
) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > limit) throw new UploadTooLarge();
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing upload body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new UploadTooLarge();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Response(bytes, {
    headers: { "content-type": request.headers.get("content-type") || "" },
  }).formData();
}
