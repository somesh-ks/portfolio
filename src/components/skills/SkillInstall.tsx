"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Segmented } from "@/components/experiments/Segmented";
import { useSound } from "@/components/providers/SoundProvider";

const TABS = ["Any agent", "Claude Code", "Manual"] as const;
type Tab = (typeof TABS)[number];

const INSTALL: Record<Tab, { commands: string[]; note: string }> = {
  "Any agent": {
    commands: ["npx skills add somesh-ks/skills --skill interface-mechanics"],
    note: "Claude Code, Cursor, Codex, Gemini CLI and other agents that read SKILL.md. Add -g to install it for every project.",
  },
  "Claude Code": {
    commands: [
      "/plugin marketplace add somesh-ks/skills",
      "/plugin install interface-mechanics@somesh-ks",
    ],
    note: "Run both inside a Claude Code session.",
  },
  Manual: {
    commands: [
      "git clone https://github.com/somesh-ks/skills",
      "cp -r skills/skills/interface-mechanics ~/.claude/skills/",
    ],
    note: "Or copy the folder into your agent's skills directory.",
  },
};

function CopyLine({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { play } = useSound();
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div className="skill-install__line">
      {/* Long commands scroll sideways on phones, so the line must be keyboard reachable. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <pre className="skill-install__command" tabIndex={0}>
        <code>{command}</code>
      </pre>
      <button
        type="button"
        className="icon-button skill-install__copy"
        aria-label={copied ? "Copied" : `Copy: ${command}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(command);
          } catch {
            return;
          }
          setCopied(true);
          play("tick");
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopied(false), 1500);
        }}
      >
        {/* Both icons share one grid cell, so the button never changes size. */}
        <span className="skill-install__icons" aria-hidden="true">
          <Copy size={15} strokeWidth={1.75} data-visible={!copied} />
          <Check size={15} strokeWidth={2} data-visible={copied} />
        </span>
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </div>
  );
}

export function SkillInstall() {
  const [tab, setTab] = useState<Tab>("Any agent");
  const { commands, note } = INSTALL[tab];
  return (
    <figure className="toy skill-install">
      <Segmented label="Install for" options={TABS} value={tab} onChange={setTab} />
      <div className="skill-install__commands">
        {commands.map((command) => (
          <CopyLine key={command} command={command} />
        ))}
      </div>
      <figcaption className="toy__caption">{note}</figcaption>
    </figure>
  );
}
