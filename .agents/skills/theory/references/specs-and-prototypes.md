# Motion specs and prototypes

Load when: handing motion to engineering, writing a motion spec or transition table, choosing between a storyboard, a video comp, and a prototype, or planning how to explore motion for a new feature.

Sources: interface-animation and motion-design practice, plus classical animation craft (timing versus spacing).

## Pick the artifact by the open question

| The open question | Artifact |
| --- | --- |
| Could motion help here, and in what order? | Storyboard: numbered, captioned frames of the whole interaction |
| What should it look like at each beat? | One style frame per key state, each good enough to ship as a still |
| How should it move, and does it fit the brand? | A motion comp (video), presented live or narrated; it shows only the happy path |
| Does it feel right, and can it be interrupted? | An interactive prototype in the browser, on a real device for gestures |
| Does it survive responsive layouts? | Prototypes at the smallest and largest viewports; if a path cannot survive, keep curve and timing constant and change the path |

A fast prototype: a screenshot of the page with only the live element animating on top of it.

## Every key state is a valid still

Design each key state as a finished composition before animating between them. Those stills double as the reduced-motion states and as the safe points where an interrupted transition may rest. Motion cannot rescue a weak frame.

## The transition table

Video and GIFs hide the values. Hand off a table with one row per animated property:

| Field | Example |
| --- | --- |
| Trigger | Click "Add to cart" |
| Element and property | `.cart-badge` `scale` |
| From, to | 1, 1.15, 1 |
| Duration | 300 ms |
| Curve or spring | `cubic-bezier(0.23, 1, 0.32, 1)`, or `{ type: "spring", duration: 0.3, bounce: 0.2 }` |
| Delay, stagger | 0 ms; 40 ms per item |
| Iterations | 1 |
| Interruption | Retargets from the current value; a second click restarts the bump |
| Reduced motion | Colour flash of the count only |
| Purpose | Feedback: the item reached the cart |

Spec both timing and spacing. A duration without its curve, or keyframe offsets, is half a spec.

For one interactive element's states, events, feedback, and timing, use `behavior` (sk-interaction-design); this table supplies its motion values.

## Frames-first pipeline

For hero, onboarding, explainer, and product-demo motion, and for any large new interaction:

1. **Brief** in three needs plus constraints. Emotional (mood), intellectual (what the viewer should think or do next), narrative (what changes). Constraints: surface, aspect ratios, total duration, sound (assume off), who drives time (autoplay, scroll, or click), and the reduced-motion state.
2. **One sentence**, then one paragraph. If the idea does not fit in a sentence, it is not ready.
3. **Do and don't list** built from adjectives with their opposites ("Do: settle softly from the trigger. Don't: rotate or bounce on exit").
4. **Thumbnails** in each target aspect ratio, mobile first, including the transitions.
5. **Storyboard** with estimated seconds per beat.
6. **One style frame**, approved before any others.
7. **Board** of key and transition frames, reviewed side by side.
8. **Motion test**: a rough animatic or a 5 s test per section, to settle timing before production.
9. **Sign-off**, then build. Interactive work adds an on-device prototype, because stills cannot express interruption, gesture velocity, or spring response.

Open wide at kick-off and narrow hard near delivery. Check the board against compositor-friendly properties before sign-off, or it becomes a contract the build cannot honour.

## Raise motion early

Bring motion in at the user-flow stage. Design the hero interaction first, in the product's motion language, then spread its curves and timing to the rest of the flow.
