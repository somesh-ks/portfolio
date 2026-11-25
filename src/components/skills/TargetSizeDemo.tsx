import { Bold, Italic, Link, List } from "lucide-react";
import { BeforeAfter } from "./BeforeAfter";

const ICONS = [
  { Icon: Bold, name: "Bold" },
  { Icon: Italic, name: "Italic" },
  { Icon: Link, name: "Link" },
  { Icon: List, name: "List" },
];

/** A formatting toolbar. The glyph stays 16px; only the tap target grows. Dashed boxes draw each target. */
function Toolbar({ size }: { size: 32 | 44 }) {
  return (
    <div className="target-demo">
      <div className="target-demo__bar" data-size={size} role="toolbar" aria-label="Formatting">
        {ICONS.map(({ Icon, name }) => (
          <button key={name} type="button" className="target-demo__button" aria-label={name}>
            <Icon aria-hidden="true" size={16} />
          </button>
        ))}
      </div>
      <p className="target-demo__readout">
        {size === 32 ? "32×32 targets, 4px apart" : "44×44 targets, the iOS default"}
      </p>
    </div>
  );
}

/** design-sys example: per-platform target sizes. Static, so it ships no client JS. */
export function TargetSizeDemo() {
  return (
    <BeforeAfter
      label="Toolbar tap targets"
      before={<Toolbar size={32} />}
      after={<Toolbar size={44} />}
    />
  );
}
