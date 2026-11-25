"use client";

/**
 * Interactive pieces used inside MDX, code-split with next/dynamic so each
 * page only downloads the toys it embeds. They still render on the server,
 * so there is no layout shift and they read fine without JavaScript.
 */
import dynamic from "next/dynamic";

/** @public used by MDX through the namespace import */
export const BeforeAfterScrubber = dynamic(() =>
  import("../case-studies/BeforeAfterScrubber").then((m) => m.BeforeAfterScrubber),
);
/** @public used by MDX through the namespace import */
export const ClaudeStickerSheet = dynamic(() =>
  import("../case-studies/ClaudeStickerSheet").then((m) => m.ClaudeStickerSheet),
);
/** @public used by MDX through the namespace import */
export const AgenticTokenDiff = dynamic(() =>
  import("../case-studies/AgenticTokenDiff").then((m) => m.AgenticTokenDiff),
);
/** @public used by MDX through the namespace import */
export const ComicStageScrubber = dynamic(() =>
  import("../case-studies/ComicStageScrubber").then((m) => m.ComicStageScrubber),
);
/** @public used by MDX through the namespace import */
export const RoycWhiteLabelSwitcher = dynamic(() =>
  import("../case-studies/RoycWhiteLabelSwitcher").then((m) => m.RoycWhiteLabelSwitcher),
);
/** @public used by MDX through the namespace import */
export const LuminovoExpressionBuilder = dynamic(() =>
  import("../case-studies/LuminovoExpressionBuilder").then((m) => m.LuminovoExpressionBuilder),
);
/** @public used by MDX through the namespace import */
export const ClaudeMascotStudio = dynamic(() =>
  import("../experiments/ClaudeMascotStudio").then((m) => m.ClaudeMascotStudio),
);
/** @public used by MDX through the namespace import */
export const OklchTokenInspector = dynamic(() =>
  import("../experiments/OklchTokenInspector").then((m) => m.OklchTokenInspector),
);
/** @public used by MDX through the namespace import */
export const AgenticStreamDemo = dynamic(() =>
  import("../experiments/AgenticStreamDemo").then((m) => m.AgenticStreamDemo),
);
/** @public used by MDX through the namespace import */
export const StableButtonDemo = dynamic(() =>
  import("../skills/StableButtonDemo").then((m) => m.StableButtonDemo),
);
/** @public used by MDX through the namespace import */
export const ClaudeRunner = dynamic(() =>
  import("../runner/ClaudeRunner").then((m) => m.ClaudeRunner),
);
