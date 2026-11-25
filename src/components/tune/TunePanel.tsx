"use client";

import { Dialog } from "@base-ui/react/dialog";
import Link from "next/link";
import type { RefObject } from "react";
import { Segmented } from "@/components/experiments/Segmented";
import { Dial } from "@/components/ui/Dial";
import { isDefault, TUNE_DEFAULT, TUNE_RANGE, type Tune } from "@/lib/tune";

export interface TunePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tune: Tune;
  onTune: (tune: Tune) => void;
  returnFocus: RefObject<HTMLButtonElement | null>;
}

const SIZES = ["14", "15", "16"] as const;
const TYPES = ["sans", "mono"] as const;
/** Double-clicking the hue dial passes this back: neutral greys again. */
const HUE_OFF = -1;

/** Non-modal, so the page stays visible, scrollable and live behind it. */
export default function TunePanel({
  open,
  onOpenChange,
  tune,
  onTune,
  returnFocus,
}: TunePanelProps) {
  const set = (patch: Partial<Tune>) => onTune({ ...tune, ...patch });
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal={false} disablePointerDismissal>
      <Dialog.Portal>
        <Dialog.Popup className="tune-panel tune-exempt" finalFocus={returnFocus}>
          <div className="tune-panel__head">
            <Dialog.Title className="tune-panel__title">$ tune</Dialog.Title>
            <div className="tune-panel__actions">
              <button
                type="button"
                className="tune-panel__reset pressable"
                disabled={isDefault(tune)}
                onClick={() => onTune(TUNE_DEFAULT)}
              >
                [reset]
              </button>
              <Dialog.Close className="tune-panel__close pressable">
                <span className="tune-panel__key">[esc]</span>
                <span className="tune-panel__word">[close]</span>
              </Dialog.Close>
            </div>
          </div>
          <Dialog.Description className="sr-only">
            Retune this page&apos;s design tokens. Changes last until you leave the homepage.
          </Dialog.Description>
          <div className="tune-panel__body">
            <Dial
              label="hue"
              className="tune-hue"
              value={tune.hue ?? TUNE_RANGE.hue.first}
              min={TUNE_RANGE.hue.min}
              max={TUNE_RANGE.hue.max}
              step={TUNE_RANGE.hue.step}
              show={tune.hue === null ? "off" : `${tune.hue}°`}
              reset={HUE_OFF}
              onChange={(hue) => set({ hue: hue === HUE_OFF ? null : hue })}
            />
            <div className="tune-panel__row">
              <span className="tune-panel__label" aria-hidden>
                type
              </span>
              <Segmented
                label="type"
                options={TYPES}
                value={tune.type}
                onChange={(type) => set({ type })}
              />
            </div>
            <div className="tune-panel__row">
              <span className="tune-panel__label" aria-hidden>
                size
              </span>
              <Segmented
                label="size in pixels"
                options={SIZES}
                value={tune.size}
                onChange={(size) => set({ size })}
              />
            </div>
            <Dial
              label="scale"
              value={tune.scale}
              {...TUNE_RANGE.scale}
              show={`${tune.scale.toFixed(2)}×`}
              reset={1}
              onChange={(scale) => set({ scale })}
            />
            <Dial
              label="density"
              value={tune.density}
              {...TUNE_RANGE.density}
              show={`${tune.density.toFixed(2)}×`}
              reset={1}
              onChange={(density) => set({ density })}
            />
          </div>
          <div className="tune-panel__foot">
            <Link href="/spring" className="tune-panel__credit">
              made with Spring →
            </Link>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
