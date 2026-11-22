"use client";

import { Volume2, VolumeOff } from "lucide-react";
import { useSound } from "@/components/providers/SoundProvider";

export function SoundToggle({ className = "" }: { className?: string }) {
  const { enabled, toggle } = useSound();
  const Icon = enabled ? Volume2 : VolumeOff;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      className={`icon-button pressable ${className}`}
    >
      <Icon aria-hidden="true" size={16} strokeWidth={1.75} />
      <span className="sr-only">Sound</span>
    </button>
  );
}
