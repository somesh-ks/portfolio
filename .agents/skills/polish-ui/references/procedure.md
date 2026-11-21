# Design procedure

Load in Style mode when designing a new feature or screen. From Refactoring UI (Wathan and Schoger).

1. **Start with a feature, not a layout.** Do not design "the app"; you cannot choose between top nav and sidebar before you know what is in the product. Design one real piece of functionality (the search form, the message composer) and let the shell emerge.
2. **Detail comes later.** Ignore typefaces, shadows, and icons early. Work in **grayscale first**: it forces hierarchy to come from spacing, contrast, and size rather than color. Add color once the layout works.
3. **Do not over-invest in low fidelity.** Sketches, wireframes, and mockups are disposable; nobody can use a static picture of an app. Abandon them once the decision is made and build the real thing.
4. **Design the smallest useful version, then build it.** Work in short design-to-code cycles. Do not imply functionality you are not ready to build: an attachments zone you cannot ship blocks the whole feature.
5. **Choose by elimination.** Guess the scale value you think is right, then compare it against the neighbour on each side. Two will be obviously wrong. If an outer option wins, re-run with it as the new middle.
6. **Start with too much white space and remove it.** Adding space until something stops looking bad gives the minimum; starting generous and trimming gives the right amount. Dense UIs (dashboards) are legitimate as a deliberate decision, not a default.
7. **Shrink the canvas.** A small component designed on a wide artboard sprawls to fill it. Start at phone width where the constraints are real, then widen and relax only what felt cramped.
