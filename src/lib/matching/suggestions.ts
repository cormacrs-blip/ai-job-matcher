import type { EvidenceKey } from "./evaluator";
export type Passage = {
  quote: string;
  context: string;
  caution: string | null;
};
const topics: Record<EvidenceKey, RegExp> = {
  requirements:
    /\b(requirements?|acceptance criteria|discovery workshops?|user stories)\b/i,
  process: /\b(process(?:es)?|fulfilment|fulfillment|workflow(?:s)?)\b/i,
  uat: /\b(UAT|user acceptance test(?:ing|s)?|acceptance tests?|release defects?)\b/i,
  roadmap: /\b(roadmaps?|product strategy|product vision)\b/i,
  discovery:
    /\b(customer interviews?|user interviews?|customer discovery|product discovery|user research)\b/i,
  backlog: /\b(backlogs?|prioriti[sz](?:ed|ation|e|ing))\b/i,
  planning:
    /\b(project plans?|delivery plans?|release plans?|dependencies|risk tracking)\b/i,
  stakeholders: /\b(stakeholders?|business teams|operations teams)\b/i,
  delivery:
    /\b(delivery reporting|release coordination|budgets?|project delivery|delivered)\b/i,
  sql: /\b(SQL|queries|query|transformations)\b/i,
  pipelines: /\b(data pipelines?|ETL|ELT)\b/i,
  warehouse: /\b(warehouse(?:s)?|data models?|dimensional models?)\b/i,
};
/** Locate candidate passages, never turn vocabulary or a job title into a capability assessment. */
export function suggestEvidence(text: string): Record<EvidenceKey, Passage[]> {
  const paragraphs = text
    .replace(/\r/g, "")
    .split(/\n\s*\n|(?<=[.!?])\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  const output = Object.fromEntries(
    Object.keys(topics).map((key) => [key, []]),
  ) as unknown as Record<EvidenceKey, Passage[]>;
  for (let index = 0; index < paragraphs.length; index++) {
    const paragraph = paragraphs[index];
    // Keep qualifiers and adjacent sentences together; do not strip negation or attribution.
    const parts =
      paragraph.length <= 1800 ? [paragraph] : paragraph.split(/\n/);
    for (const part of parts) {
      if (part.length < 25 || part.length > 1800 || /Evidence \[/i.test(part))
        continue;
      const caution =
        /\b(no|not|never|without|basic|limited|exposure|assisted|supported|observed|learning)\b/i.test(
          part,
        )
          ? "Check limitations and ownership carefully. This passage includes qualifying language."
          : null;
      for (const key of Object.keys(topics) as EvidenceKey[]) {
        if (
          topics[key].test(part) &&
          output[key].length < 3 &&
          !output[key].some((item) => item.quote === part)
        )
          output[key].push({
            quote: part,
            context:
              index > 0
                ? paragraphs[index - 1].slice(0, 240)
                : "Start of document",
            caution,
          });
      }
    }
  }
  return output;
}
