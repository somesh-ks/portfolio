# Test plan

Load when: planning accessibility testing, setting up CI checks, defining a screen reader and browser matrix, or recruiting and running sessions with assistive-technology users.

## QA protocol

Run the layers in this order. Each catches what the one before it cannot.

### 1. Automated checks

- Axe, Lighthouse or WAVE on every page and state, wired into the CI pipeline.
- A pass is necessary, never sufficient. How much automation catches depends on what is counted:

| Counted by | Figure | Source |
| --- | --- | --- |
| Share of WCAG success criteria a tool can fully test | About 20 to 30 percent, the commonly cited range | [Deque, March 2021](https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues) |
| Share of known barriers deliberately planted on one test page | Best tool 40 percent, worst 13 percent, of 142 barriers across 13 tools | [GDS, February 2017](https://accessibility.blog.gov.uk/2017/02/24/what-we-found-when-we-tested-tools-on-the-worlds-least-accessible-webpage/) |
| Share of real issues by volume, across about 13,000 pages from over 2,000 audits | 57 percent, measured by the tool vendor with axe | [Deque, March 2021](https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues) |

The figures disagree mostly because of what is counted. A few automatable failure types dominate real pages: in the 2026 WebAIM Million, 96 percent of detected errors fell into six categories, led by low contrast text, missing alt text and missing form labels ([WebAIM Million, 2026](https://webaim.org/projects/million/)). Criteria-level coverage stays low because keyboard operability, focus order, meaningful names and reading order need a person. Quote the range with its counting method, never a single percentage.

### 2. Manual keyboard walk

- Complete every flow with the keyboard alone, in visual order, with a visible focus indicator at every stop.
- Check overlays: focus moves in on open, Escape closes, focus returns to the trigger.

### 3. Manual preference checks

- Zoom to 200% and 400%.
- High contrast (forced colors) mode.
- Reduced motion mode.

### 4. Screen reader and browser matrix

For each key user flow, test every row that applies to the product's platforms:

| Screen reader | Platform | Browser |
| --- | --- | --- |
| VoiceOver | macOS | Safari |
| VoiceOver | iOS | Safari |
| NVDA | Windows | Firefox or Chrome |
| TalkBack | Android | Chrome |

Also cover voice control (Voice Control on Mac and iOS, Dragon), switch control and screen magnification where the audience needs them.

### 5. WCAG coverage and reporting

- Organize the checklist by principle (Perceivable, Operable, Understandable, Robust) and level (A, AA, AAA).
- Record each issue with: description, WCAG criterion, severity, assistive technology affected, steps to reproduce and remediation.
- Prioritize by user impact, not compliance level alone.
- Test early and continuously, and put accessibility in the definition of done.

## Sessions with assistive-technology users

Use sessions to learn whether real tasks succeed, which the QA protocol cannot show.

- Recruit participants with relevant disabilities across vision, motor, cognitive and hearing needs.
- Have them use their own devices, assistive technology and settings.
- Give them real tasks, not compliance checkboxes. Observe where they stall, and ask after the task, not during it.
- Schedule sessions once the QA protocol passes, so participants spend their time on usability and not on known defects.
- Log findings in the same issue format, adding the participant's assistive technology and the task that failed.
