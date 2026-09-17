import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { z } from "zod";
export const topics = [
  "hvem-eier-bilen",
  "registreringsnummer",
  "regnr",
  "regnummer",
  "skiltnummer",
  "bilnummer",
  "bilskilt",
  "bilregister",
  "kjoretoyopplysninger",
  "bilinfo",
  "heftelser",
  "eieropplysninger",
] as const;
const Meta = z.object({
  title: z.string().min(5).max(150),
  description: z.string().min(20).max(300),
  published: z.boolean(),
  updated: z.string().date(),
  author: z.string().optional(),
  related: z
    .array(z.string().regex(/^[a-z0-9-]+$/))
    .max(12)
    .default([]),
});
export async function article(slug: string, kind: "pages" | "blogg") {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  let text: string;
  try {
    text = await fs.readFile(
      path.join(process.cwd(), "content", kind, `${slug}.md`),
      "utf8",
    );
  } catch {
    return null;
  }
  const parsed = matter(text);
  const meta = Meta.safeParse(parsed.data);
  if (
    !meta.success ||
    !meta.data.published ||
    parsed.content.trim().length < 100 ||
    (kind === "blogg" && !meta.data.author)
  )
    return null;
  const html = sanitizeHtml(await marked.parse(parsed.content), {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "h1", "h2"],
    allowedAttributes: { a: ["href", "title"] },
    allowedSchemes: ["https"],
    allowProtocolRelative: false,
  });
  return {
    ...meta.data,
    slug,
    html,
    path: kind === "blogg" ? `/blogg/${slug}` : `/${slug}`,
  };
}
export async function articles(kind: "pages" | "blogg") {
  const files = await fs
    .readdir(path.join(process.cwd(), "content", kind))
    .catch(() => [] as string[]);
  const entries = await Promise.all(
    files
      .filter((f) => f.endsWith(".md"))
      .map((f) => article(f.slice(0, -3), kind)),
  );
  return entries.filter((x): x is NonNullable<typeof x> => Boolean(x));
}
