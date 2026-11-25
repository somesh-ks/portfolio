"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Braces, Clapperboard, Copy, Download, FileCode, Image as ImageIcon } from "lucide-react";
import { type Look, lookToQuery, stickerSvg } from "@/lib/stickers";
import { useSound } from "@/components/providers/SoundProvider";
import { Segmented } from "../Segmented";

type Note = "" | "Copied" | "Failed";
const SIZES = ["512", "1024"] as const;
type Size = (typeof SIZES)[number];

const route = (look: Look, rest: string, frame?: number) =>
  `/stickers/export?${lookToQuery(look, frame === undefined ? undefined : { frame })}&${rest}`;

const ICON = { size: 20, strokeWidth: 1.75, "aria-hidden": true } as const;

function Tile({
  icon,
  label,
  aria,
  href,
  file,
}: {
  icon: ReactNode;
  label: string;
  aria: string;
  href: string;
  file: string;
}) {
  return (
    <a className="stickers-xtile pressable" href={href} download={file} aria-label={aria}>
      {icon}
      <span aria-hidden="true">{label}</span>
    </a>
  );
}

const fileName = (look: Look) => ["claude", look.action, ...look.items].join("-");

/** The panel's body. Mounts only while open, so the still thumbnail is drawn on demand. */
function Panel({ look, still }: { look: Look; still: number }) {
  const { play } = useSound();
  const [size, setSize] = useState<Size>("512");
  const [square, setSquare] = useState(false);
  const [note, setNote] = useState<Note>("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const say = (n: Note) => {
    setNote(n);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNote(""), 1600);
  };

  const name = fileName(look);
  const raster = `s=${size}${square ? "&sq=1" : ""}`;
  const tag = `${size === "1024" ? "-1024" : ""}${square ? "-square" : ""}`;
  const n = still + 1;
  const svg = useMemo(() => stickerSvg(look, { animated: false, frame: still }), [look, still]);
  const pngHref = route(look, `f=png&${raster}`, still);

  const copy = () => {
    // The promise goes to the clipboard unresolved, so Safari keeps the click's permission.
    const png = fetch(pngHref).then((r) => {
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

  return (
    <>
      <Popover.Title className="sr-only">Export</Popover.Title>
      <section className="stickers-pop__group">
        <h3 className="stickers-pop__head">Animated</h3>
        <div className="stickers-tiles">
          <Tile
            icon={<Clapperboard {...ICON} />}
            label="GIF"
            aria="Download GIF"
            href={route(look, `f=gif&${raster}`)}
            file={`${name}${tag}.gif`}
          />
          <Tile
            icon={<FileCode {...ICON} />}
            label="SVG"
            aria="Download animated SVG"
            href={route(look, "f=svg")}
            file={`${name}.svg`}
          />
          <Tile
            icon={<Braces {...ICON} />}
            label="Lottie"
            aria="Download Lottie JSON"
            href={route(look, "f=json")}
            file={`${name}.json`}
          />
        </div>
      </section>
      <section className="stickers-pop__group">
        <h3 className="stickers-pop__head">
          <span
            className="stickers-pop__thumb"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <span>Still · frame {n}</span>
        </h3>
        <div className="stickers-tiles">
          <Tile
            icon={<ImageIcon {...ICON} />}
            label="PNG"
            aria={`Download PNG, frame ${n}`}
            href={pngHref}
            file={`${name}${tag}.png`}
          />
          <Tile
            icon={<FileCode {...ICON} />}
            label="SVG"
            aria={`Download still SVG, frame ${n}`}
            href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
            file={`${name}-still.svg`}
          />
          <button
            type="button"
            className="stickers-xtile pressable"
            aria-label="Copy PNG"
            data-sound="none"
            onClick={copy}
          >
            <Copy {...ICON} />
            <span aria-hidden="true">{note || "Copy"}</span>
          </button>
        </div>
      </section>
      <div className="stickers-pop__foot">
        <Segmented label="Size" options={SIZES} value={size} onChange={setSize} />
        <button
          type="button"
          className="button pressable stickers-square"
          aria-pressed={square}
          onClick={() => setSquare(!square)}
        >
          Square
        </button>
      </div>
      <output className="sr-only">{note}</output>
    </>
  );
}

/**
 * One Export button that opens a panel of icon tiles. Downloads are plain links to the export
 * route, so they work without script too. `still` is the frame the still row exports.
 */
export function ExportMenu({ look, still }: { look: Look; still: number }) {
  return (
    <Popover.Root>
      <Popover.Trigger className="button button--primary stickers-export">
        <Download aria-hidden="true" size={16} strokeWidth={1.75} />
        Export
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={4} align="end" collisionPadding={16} className="z-50">
          <Popover.Popup className="spring-pop stickers-pop">
            <Panel look={look} still={still} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
