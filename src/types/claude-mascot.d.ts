import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "claude-mascot": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        animation?: string;
        grid?: boolean;
        paused?: boolean;
      };
    }
  }
}
