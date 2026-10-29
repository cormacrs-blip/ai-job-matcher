export type DescriptionBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

/** Display formatting only; original stored source and evaluation input are unchanged. */
export function formatJobDescription(source: string): {
  blocks: DescriptionBlock[];
  unwrapped: boolean;
} {
  let text = source;
  let unwrapped = false;
  try {
    const parsed: unknown = JSON.parse(source);
    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      typeof (parsed as Record<string, unknown>).text === "string" &&
      (parsed as Record<string, string>).text.trim()
    ) {
      text = (parsed as Record<string, string>).text;
      unwrapped = true;
    }
  } catch {
    // Plain text or malformed JSON remains visible exactly as supplied.
  }
  const blocks: DescriptionBlock[] = [];
  let paragraph: string[] = [];
  let bullets: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length)
      blocks.push({ type: "paragraph", text: paragraph.join("\n") });
    paragraph = [];
  };
  const flushBullets = () => {
    if (bullets.length) blocks.push({ type: "list", items: bullets });
    bullets = [];
  };
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      flushBullets();
      continue;
    }
    const bullet = line.match(/^(?:[•●▪*]|[-–])\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      bullets.push(bullet[1]);
      continue;
    }
    flushBullets();
    const heading =
      line.length <= 100 &&
      !/[.!?]$/.test(line) &&
      (/^[A-Z][A-Z\s&/\-]+:?$/.test(line) ||
        /^(?:job description|the company|position|about (?:the|this|our) (?:role|job|company|team)|(?:job )?responsibilities|(?:job )?qualifications|requirements|what (?:you.ll do|we.re looking for)|benefits|business unit|scheduled weekly hours|number of openings available|worker type|more about .+):?$/i.test(
          line,
        ));
    if (heading) {
      flushParagraph();
      blocks.push({ type: "heading", text: line.replace(/:$/, "") });
    } else paragraph.push(line);
  }
  flushParagraph();
  flushBullets();
  return { blocks, unwrapped };
}
