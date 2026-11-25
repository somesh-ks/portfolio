"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { Download } from "lucide-react";
import { allowed, type Look, lookToQuery, MOVES } from "@/lib/stickers";
import { useSound } from "@/components/providers/SoundProvider";
import { Chevron } from "@/components/ui/Select";
import { zip } from "../spring/zip";

type Tab = "static" | "animated";
type Note = "" | "Copied" | "Saved" | "Failed";

const route = (look: Look, rest: string, frame?: number) =>
  `/stickers/export?${lookToQuery(look, frame === undefined ? undefined : { frame })}&${rest}`;

function save(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

async function bytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  return new Uint8Array(await res.arrayBuffer());
}

function menuLink(label: string, aria: string, href: string, file: string) {
  return (
    <Menu.Item
      className="select__item"
      render={<a href={href} download={file} aria-label={aria} />}
    >
      <span className="select__text">{label}</span>
    </Menu.Item>
  );
}

function group(title: string, children: ReactNode) {
  return (
    <Menu.Group className="stickers-menu__group">
      <Menu.GroupLabel className="stickers-menu__label">{title}</Menu.GroupLabel>
      {children}
    </Menu.Group>
  );
}

const fileName = (look: Look) => ["claude", look.move, ...look.props].join("-");

/**
 * A split button like Spring's: the main press downloads the headline format, the menu lists the
 * rest. Downloads are plain links to the export route, so they work without script too.
 */
export function ExportMenu({
  look,
  tab,
  frame,
  svg,
}: {
  look: Look;
  tab: Tab;
  /** The static frame on screen. */
  frame: number;
  /** The static sticker markup, saved as-is for the SVG item. */
  svg: string;
}) {
  const { play } = useSound();
  const [note, setNote] = useState<Note>("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const say = (n: Note) => {
    setNote(n);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNote(""), 1600);
  };

  const animated = tab === "animated";
  const main = animated ? route(look, "f=gif") : route(look, "f=png&s=512", frame);
  const name = fileName(look);

  const copy = () => {
    // The promise goes to the clipboard unresolved, so Safari keeps the click's permission.
    const png = fetch(route(look, "f=png&s=512", frame)).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.blob();
    });
    navigator.clipboard
      .write([new ClipboardItem({ "image/png": png })])
      .then(() => {
        play("pop");
        say("Copied");
      })
      .catch(() => say("Failed"));
  };

  const all = async () => {
    const ext = animated ? "gif" : "png";
    const moves = MOVES.filter((m) => look.props.every((p) => allowed(m.id, p)));
    try {
      const files = await Promise.all(
        moves.map(async (m) => ({
          path: `${["claude", m.id, ...look.props].join("-")}.${ext}`,
          content: await bytes(route({ ...look, move: m.id }, animated ? "f=gif" : "f=png&s=512")),
        })),
      );
      save(`claude-stickers-${ext}.zip`, zip(files));
      say("Saved");
    } catch {
      say("Failed");
    }
  };

  return (
    <span className="spring-split">
      <a
        href={main}
        download={`${name}.${animated ? "gif" : "png"}`}
        className="button button--primary spring-split__main"
        aria-label={animated ? "Export GIF" : "Export PNG"}
      >
        <Download
          aria-hidden="true"
          size={16}
          strokeWidth={1.75}
          className="stickers-export-icon"
        />
        <span aria-hidden="true" className="stickers-export-label">
          {note || "Export"}
        </span>
      </a>
      <Menu.Root>
        <Menu.Trigger
          className="button button--primary spring-split__more"
          aria-label="More exports"
        >
          <Chevron />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={4} align="end" collisionPadding={16} className="z-50">
            <Menu.Popup className="select__popup spring-menu">
              {animated ? (
                <>
                  {group(
                    "GIF",
                    <>
                      {menuLink("512", "Download GIF 512", route(look, "f=gif"), `${name}.gif`)}
                      {menuLink(
                        "Square",
                        "Download square GIF",
                        route(look, "f=gif&sq=1"),
                        `${name}-square.gif`,
                      )}
                    </>,
                  )}
                  {menuLink(
                    "Animated SVG",
                    "Download animated SVG",
                    route(look, "f=svg"),
                    `${name}.svg`,
                  )}
                  {menuLink(
                    "Lottie",
                    "Download Lottie JSON",
                    route(look, "f=json"),
                    `${name}.json`,
                  )}
                </>
              ) : (
                <>
                  {group(
                    "PNG",
                    <>
                      {menuLink(
                        "512",
                        "Download PNG 512",
                        route(look, "f=png&s=512", frame),
                        `${name}.png`,
                      )}
                      {menuLink(
                        "1024",
                        "Download PNG 1024",
                        route(look, "f=png&s=1024", frame),
                        `${name}-1024.png`,
                      )}
                      {menuLink(
                        "Square",
                        "Download square PNG",
                        route(look, "f=png&s=512&sq=1", frame),
                        `${name}-square.png`,
                      )}
                    </>,
                  )}
                  <Menu.Item
                    className="select__item"
                    aria-label="Download SVG"
                    onClick={() => save(`${name}.svg`, new Blob([svg], { type: "image/svg+xml" }))}
                  >
                    <span className="select__text">SVG</span>
                  </Menu.Item>
                  <Menu.Item
                    className="select__item"
                    data-sound="none"
                    aria-label="Copy PNG"
                    onClick={copy}
                  >
                    <span className="select__text">Copy</span>
                  </Menu.Item>
                </>
              )}
              <Menu.Separator className="spring-menu__rule" />
              <Menu.Item
                className="select__item"
                aria-label="Download all moves as zip"
                onClick={() => void all()}
              >
                <span className="select__text">All moves (.zip)</span>
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <output className="sr-only">{note}</output>
    </span>
  );
}
