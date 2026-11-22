# Library picks

Load only when a fix needs a new primitive or library. The project's existing primitives come first, and one interaction surface never mixes primitive systems.

| Task | Library | Target use |
| --- | --- | --- |
| Accessible UI primitives | [Base UI](https://base-ui.com) | Dialogs, popovers, menus, and selects with clean slot architecture |
| Command palettes | [cmdk](https://cmdk.paco.me) | Unstyled, fast keyboard command menu |
| Toast notifications | [Sonner](https://www.npmjs.com/package/sonner) | Stacked, gesture-driven toasts |
| OTP verification inputs | [input-otp](https://input-otp.rodz.dev) | One-time password inputs with single-character slot styling |
| Number animation | [NumberFlow](https://number-flow.barvian.me) | Localized digit transitions with tabular layouts |
| Long list virtualization | [Virtuoso](https://virtuoso.dev) | High-performance virtualized lists and tables with dynamic item heights |
| Drag and drop | [dnd kit](https://dndkit.com) | Accessible, lightweight drag and drop |
| Streaming / real-time charts | [Liveline](https://github.com/benjitaylor/liveline) | Canvas-accelerated streaming time-series charts |
| Dashboard charts | [Recharts](https://recharts.org) | Composable SVG chart components |
| State management | [Zustand](https://zustand.docs.pmnd.rs) | Unopinionated, minimal store without Context boilerplate |
| Variant styling | [cva](https://cva.style) + [clsx](https://github.com/lukeed/clsx) | Type-safe component variant API |
| Theme switching | [next-themes](https://github.com/pacocoursey/next-themes) | Zero-flash dark mode switching with system preference detection |
| Code syntax highlighting | [Shiki](https://shiki.style) | Accurate TextMate grammar code highlighting |

Chart library choice beyond these two belongs to `charts`; adding motion with NumberFlow or any other library belongs to `animate` (sk-motion-design).
