import { readFile } from "node:fs/promises";
import path from "node:path";

export type LegalSource = "terms" | "privacy";

type LegalBlock =
  | { type: "title"; text: string }
  | { type: "updated"; text: string }
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

export async function loadLegalMarkdown(source: LegalSource): Promise<string> {
  const file = source === "terms" ? "terms.md" : "privacy.md";
  return readFile(path.join(process.cwd(), "content", file), "utf8");
}

/**
 * The two legal documents are short, hand-written markdown: a title, a "Last updated"
 * line, `##` sections, paragraphs, and dashes. Parsed here so the pages stay presentational
 * and the files in `content/` remain the source.
 */
export function parseLegalMarkdown(source: string): LegalBlock[] {
  const blocks: LegalBlock[] = [];
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";

    if (line.trim() === "") {
      index += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push({ type: "heading", text: line.slice(3).trim() });
      index += 1;
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push({ type: "title", text: line.slice(2).trim() });
      index += 1;
      continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && (lines[index] ?? "").startsWith("- ")) {
        items.push((lines[index] ?? "").slice(2).trim());
        index += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    const text = line.trim();
    if (/^last updated:/i.test(text)) {
      blocks.push({ type: "updated", text });
    } else {
      blocks.push({ type: "paragraph", text });
    }
    index += 1;
  }

  return blocks;
}

export function LegalDocument({ source }: { source: string }) {
  const blocks = parseLegalMarkdown(source);

  return (
    <article className="flex flex-col">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "title":
            return (
              <h1
                key={index}
                className="font-display text-[clamp(32px,6vw,44px)] font-semibold leading-[1.08]
                           tracking-[-0.028em] text-espresso"
              >
                {block.text}
              </h1>
            );
          case "updated":
            return (
              <p
                key={index}
                className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
              >
                {block.text}
              </p>
            );
          case "heading":
            return (
              <h2
                key={index}
                className="mt-10 font-serif text-[22px] font-medium tracking-[-0.02em] text-espresso"
              >
                {block.text}
              </h2>
            );
          case "paragraph":
            return (
              <p key={index} className="mt-3.5 text-[15.5px] leading-[1.7] text-soft">
                <RichText text={block.text} />
              </p>
            );
          case "list":
            return (
              <ul key={index} className="mt-3.5 list-disc space-y-2 pl-5 text-[15.5px] leading-[1.7] text-soft">
                {block.items.map((item) => (
                  <li key={item}>
                    <RichText text={item} />
                  </li>
                ))}
              </ul>
            );
        }
      })}
    </article>
  );
}

function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\b[\w.+-]+@[\w.-]+\.\w+\b)/g);

  return parts.map((part, index) => {
    const bold = /^\*\*(.+)\*\*$/.exec(part);
    if (bold) {
      return (
        <strong key={index} className="font-semibold text-espresso">
          {bold[1]}
        </strong>
      );
    }

    if (/^[\w.+-]+@[\w.-]+\.\w+$/.test(part)) {
      return (
        <a
          key={index}
          href={`mailto:${part}`}
          className="text-clay hover:text-clay-dark"
        >
          {part}
        </a>
      );
    }

    return <span key={index}>{part}</span>;
  });
}
