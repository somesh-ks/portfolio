"use client";

import { useState } from "react";
import { Command } from "@/components/code/Command";
import { Segmented } from "@/components/experiments/Segmented";

const TABS = ["Any agent", "Claude Code", "Manual"] as const;
type Tab = (typeof TABS)[number];

const INSTALL: Record<Tab, { commands: string[]; note: string; prompt?: string }> = {
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
    prompt: ">",
  },
  Manual: {
    commands: [
      "git clone https://github.com/somesh-ks/skills",
      "mkdir -p ~/.claude/skills && cp -r skills/skills/interface-mechanics ~/.claude/skills/",
    ],
    note: "Or copy the folder into your agent's skills directory.",
  },
};

export function SkillInstall() {
  const [tab, setTab] = useState<Tab>("Any agent");
  const { commands, note, prompt } = INSTALL[tab];
  return (
    <figure className="toy skill-install">
      <Segmented label="Install for" options={TABS} value={tab} onChange={setTab} />
      <div className="skill-install__commands">
        {commands.map((command) => (
          <Command key={command} command={command} prompt={prompt} />
        ))}
      </div>
      <figcaption className="toy__caption">{note}</figcaption>
    </figure>
  );
}
