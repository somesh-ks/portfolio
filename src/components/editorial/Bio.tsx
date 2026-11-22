import { existsSync } from "node:fs";
import path from "node:path";
import { BIO, COMPANIES, type CompanyId } from "@content/profile";
import { CompanyPreview } from "./CompanyPreview";

const TOKEN = /\{company:([a-z]+)\}/g;

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
              if (index % 2 === 0) return part;
              const company = COMPANIES[part as CompanyId];
              return company ? (
                <CompanyPreview
                  key={part}
                  company={company}
                  thumbnail={hasFile("previews", `${part}.webp`)}
                  logo={hasFile("logos", `${part}.webp`)}
                />
              ) : (
                part
              );
            })}
          </p>
        );
      })}
    </div>
  );
}
