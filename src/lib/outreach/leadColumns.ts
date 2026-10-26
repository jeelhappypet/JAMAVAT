/**
 * The sheet's columns and the CSV reader/writer, kept apart from
 * `lib/outreach/import.ts` so HQ's screen can describe a column without
 * dragging Mongoose and the database driver into the browser bundle — the
 * same split as `lib/site/statLabels.ts` and for the same reason.
 *
 * Nothing in this file touches the database. Defining the columns once is
 * what stops the template offering a column the importer then ignores.
 */

/**
 * The sheet's columns, defined once. The blank template HQ hands out, the
 * export, the parser and the help text in the dialog all read this list, so
 * a column can never exist in the template and be ignored on the way back in.
 */
export const LEAD_COLUMNS = [
  { name: "business", hint: "Required. The shop's name.", example: "Iron Fitness" },
  { name: "category", hint: "Gym, Dental clinic, Salon…  One per area gets exclusivity.", example: "Gym" },
  { name: "area", hint: "Adajan, Vesu, Piplod…", example: "Adajan" },
  { name: "owner_name", hint: "Who the pitch greets. Falls back to the business name.", example: "Rajesh bhai" },
  { name: "email", hint: "Their own published address. Leave blank if there isn't one.", example: "owner@ironfitness.in" },
  { name: "phone", hint: "Any format; 10 digits is enough.", example: "9876543210" },
  { name: "instagram", hint: "Handle. A shop that posts weekly already buys advertising.", example: "@ironfitness.surat" },
  { name: "sessions_in_area", hint: "Live restaurants in that area x 1800. Goes into the pitch, so it must be true.", example: "9000" },
  { name: "lang", hint: "gu or en. Blank means ગુજરાતી.", example: "gu" },
  { name: "notes", hint: "Anything for you. Never sent.", example: "Big board outside, spends on hoardings" },
  { name: "maps_search", hint: "The Maps query the row came from.", example: "gym in Adajan Surat" },
] as const;

/** One CSV field, quoted only when it has to be. */
function cell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function toCsv(rows: Record<string, string>[]): string {
  const header = LEAD_COLUMNS.map((c) => c.name);
  return [header.join(","), ...rows.map((row) => header.map((name) => cell(row[name] ?? "")).join(","))].join("\n") + "\n";
}

/**
 * The blank sheet. Two example rows rather than none: the shape of
 * `sessions_in_area` and an empty `email` are both easier to copy than to
 * describe, and they are obviously placeholders to delete.
 */
export function templateCsv(): string {
  return toCsv([
    Object.fromEntries(LEAD_COLUMNS.map((c) => [c.name, c.example])),
    { business: "Smile Dental", category: "Dental clinic", area: "Vesu", email: "", phone: "9876500000", sessions_in_area: "5400", notes: "No website — WhatsApp only" },
  ]);
}

/** Minimal RFC-4180: quoted fields, doubled quotes, commas and newlines inside them. */
export function parseCsv(input: string): Record<string, string>[] {
  // A sheet downloaded from here carries a BOM so Excel reads it as UTF-8;
  // pasted back, that byte would make the first heading "\uFEFFbusiness" and
  // every row would look like it had no business name.
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") field += char;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const filled = rows.filter((cells) => cells.some((cell) => cell.trim()));
  const [header, ...body] = filled;
  if (!header) return [];
  const names = header.map((name) => name.trim().toLowerCase());
  return body.map((cells) => Object.fromEntries(names.map((name, index) => [name, (cells[index] || "").trim()])));
}
