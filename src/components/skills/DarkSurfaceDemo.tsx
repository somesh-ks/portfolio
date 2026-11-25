import { BeforeAfter } from "./BeforeAfter";

/** A dark mode card. Black on black with a shadow vanishes; a lighter surface step lifts it. */
function Surface({ elevated }: { elevated: boolean }) {
  return (
    <div className="surface-demo" data-elevated={elevated}>
      <div className="surface-demo__page" aria-hidden="true">
        <div className="surface-demo__card" />
      </div>
      <p className="target-demo__readout">
        {elevated ? "card one surface step lighter" : "#000 card, shadow on #000"}
      </p>
    </div>
  );
}

/** sk-design-sys example: dark mode elevation, from its real audit of a theme file. Static. */
export function DarkSurfaceDemo() {
  return (
    <BeforeAfter
      label="A card in dark mode"
      before={<Surface elevated={false} />}
      after={<Surface elevated />}
    />
  );
}
