import { existsSync } from "node:fs";
import path from "node:path";
import { BIO, COMPANIES, type CompanyId } from "@content/profile";
import { CompanyLogo } from "./CompanyLogo";
import { CompanyPreview } from "./CompanyPreview";

const TOKEN = /\{company:([a-z]+)\}/g;
const GLUE = /^[.,;:!?)]+/;

function hasFile(...segments: string[]): boolean {
  return existsSync(path.join(process.cwd(), "public", ...segments));
}

export function Bio() {
  return (
    <div className="bio">
      {BIO.map((paragraph) => {
        const parts = paragraph.split(TOKEN);
        return (
          <p key={paragraph.slice(0, 24)}>
            {parts.map((part, index) => {
              // split() with one capture group alternates text, id, text, id...
              // Punctuation right after a company sticks to it, so a line never
              // starts with a stray comma (the trigger is an atomic inline box).
              if (index % 2 === 0) return index > 0 ? part.replace(GLUE, "") : part;
              const company = COMPANIES[part as CompanyId];
              if (!company) return part;
              const glued = parts[index + 1]?.match(GLUE)?.[0] ?? "";
              return (
                <span key={part} className="nowrap">
                  <CompanyPreview
                    company={company}
                    thumbnail={hasFile("previews", `${part}.webp`)}
                    logo={<CompanyLogo id={part as CompanyId} />}
                  />
                  {glued}
                </span>
              );
            })}
          </p>
        );
      })}
    </div>
  );
}
