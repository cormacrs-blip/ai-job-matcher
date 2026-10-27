import type {
  TrackerDataset,
  TrackerJob,
  TrackerDescription,
} from "./tracker-import";
/** Read a user-selected spreadsheet in the browser; never send it to a server. */
export async function readTrackerSpreadsheet(
  bytes: ArrayBuffer,
): Promise<TrackerDataset> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(bytes, {
    type: "array",
    cellText: true,
    cellStyles: true,
  });
  if (workbook.SheetNames.length > 100)
    throw new Error("This spreadsheet has too many sheets.");
  const groups = new Map<string, TrackerJob>();
  let rowsRead = 0;
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet["!ref"]) continue;
    const range = XLSX.utils.decode_range(sheet["!ref"]);
    if (range.e.r > 100000 || range.e.c > 200)
      throw new Error("This spreadsheet is too large to import safely.");
    let header = -1;
    const columns = new Map<string, number>();
    for (let row = 0; row <= Math.min(range.e.r, 9); row++) {
      const found = new Map<string, number>();
      for (let col = 0; col <= range.e.c; col++) {
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
        const value = String(cell?.w ?? cell?.v ?? "").trim();
        if (value) found.set(value, col);
      }
      if (found.has("Company") && found.has("Job Title")) {
        header = row;
        for (const [key, value] of found) columns.set(key, value);
        break;
      }
    }
    if (header < 0) continue;
    const cell = (row: number, label: string) => {
      const col = columns.get(label);
      return col === undefined
        ? undefined
        : sheet[XLSX.utils.encode_cell({ r: row, c: col })];
    };
    const value = (row: number, label: string) => {
      const c = cell(row, label);
      return String(c?.w ?? c?.v ?? "").trim();
    };
    for (let row = header + 1; row <= range.e.r; row++) {
      const company = value(row, "Company"),
        title = value(row, "Job Title");
      if (!company || !title) continue;
      if (++rowsRead > 20000)
        throw new Error("This spreadsheet contains too many job entries.");
      const urlcell =
        cell(row, "Posting URL") || cell(row, "Canonical URL / Job ID");
      const raw = String(
        urlcell?.l?.Target ?? urlcell?.w ?? urlcell?.v ?? "",
      ).trim();
      const url = /^https?:\/\//i.test(raw) ? raw.split("#")[0] : "";
      const key = url ? `url:${url}` : `row:${name}:${row + 1}`;
      let job = groups.get(key);
      if (!job) {
        job = {
          id: key,
          company,
          title,
          location: value(row, "Location"),
          url,
          references: [],
          descriptions: [],
          fetchStatus: url ? "not_checked" : "no_url",
        };
        groups.set(key, job);
      }
      const status = value(row, "Tracker Status") || value(row, "User Status");
      const fit =
        value(row, "Fit Rating") || value(row, "Verdict / Disposition");
      job.references.push({
        sheet: name,
        row: row + 1,
        ...(status ? { trackerStatus: status } : {}),
        ...(fit ? { recordedFit: fit } : {}),
      });
      for (let col = 0; col <= range.e.c; col++) {
        const c = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
        if (!c) continue;
        const candidates: { text: string; sourceType: string }[] = [];
        if (typeof c.v === "string")
          candidates.push({ text: c.v, sourceType: "cell" });
        for (const note of c.c || [])
          if (typeof note.t === "string")
            candidates.push({ text: note.t, sourceType: "comment" });
        for (const candidate of candidates) {
          const text = candidate.text;
          const mayBePosting =
            (text.length > 1200 &&
              /\b(responsibilities|qualifications|requirements|about the role)\b/i.test(
                text,
              )) ||
            (text.length > 150 && /\bdiscovery copy\s*:/i.test(text));
          if (
            !mayBePosting ||
            job.descriptions.some((d: TrackerDescription) => d.text === text)
          )
            continue;
          job.descriptions.push({
            text,
            source: `Spreadsheet ${candidate.sourceType}, ${name} row ${row + 1}; may be an excerpt or contain analysis`,
            truncated:
              text.length >= 32767 || /\bdiscovery copy\s*:/i.test(text),
          });
        }
      }
    }
  }
  if (!groups.size)
    throw new Error(
      "No tracker sheets with Company and Job Title columns were found.",
    );
  return {
    format: "align-tracker-v1",
    generatedAt: new Date().toISOString(),
    jobs: [...groups.values()],
  };
}
