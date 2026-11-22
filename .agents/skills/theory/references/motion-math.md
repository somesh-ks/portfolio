# Motion math

Load when: reading or authoring a cubic-bezier, writing a JS tween or rAF loop, making motion frame-rate independent, converting or tuning a spring by its physics, computing momentum, a parallax factor, a rubber band, an orbit or wave, a large zoom, or a fluid travel distance.

Sources: web-design math references, classical animation craft (perspective spacing), and web animation engineering practice. Items marked *(standard)* are textbook results not taken from those sources. Corrections are folded in.

## Cubic-bezier anatomy

- `cubic-bezier(x1, y1, x2, y2)` runs from (0, 0) to (1, 1); x is time, y is progress. x1 and x2 must stay in [0, 1]; y1 and y2 may leave it (below 0 anticipates, above 1 overshoots).
- A curve is symmetric when (x2, y2) = (1 - x1, 1 - y1).
- *(standard)* Start speed is y1 / x1 and end speed is (1 - y2) / (1 - x2), in multiples of average speed. A "strong" ease-out starts many times faster than average: `cubic-bezier(0.23, 1, 0.32, 1)` starts at about 4.3 times average speed, while the keyword `ease` starts at 0.4 times.
- Control-point y values exaggerate real overshoot: `cubic-bezier(0.7, -0.5, 0.25, 1.5)` only reaches about -0.08 and 1.08.
- A curve with a low y1 and a low y2 accelerates; it is an ease-in, whatever it is called.

## Time, interpolation, and mapping

```js
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const lerp = (a, b, t) => a + (b - a) * t;
const invLerp = (a, b, v) => (v - a) / (b - a);
const map = (v, a, b, c, d) => lerp(c, d, invLerp(a, b, v));
const t = clamp((now - start) / duration, 0, 1);   // normalised time
const value = lerp(from, to, ease(t));
```

- CSS keyframe offsets are fractions: a keyframe at 25% of a 600 ms animation fires at 150 ms. Changing the duration rescales every segment and hold.
- Ease-out cubic: `t => 1 - (1 - t) ** 3`; at t = 0.5 it is 0.875. Use JS easing only for canvas, WebGL, or non-CSS values; DOM properties belong to CSS, WAAPI, or Motion.

## Frame-rate independence

rAF fires at the display's refresh rate (60 to 144 Hz), so per-frame increments run twice as fast at 120 Hz. Integrate with delta time in seconds, and cap it so a resumed background tab does not jump.

```js
let last;
function tick(now) {
  const dt = Math.min((now - (last ?? now)) / 1000, 0.05);
  last = now;
  v += a * dt;            // acceleration is per second too
  x += v * dt;
  el.style.translate = `${x}px 0`;
  if (Math.abs(v) > 1) requestAnimationFrame(tick); else last = undefined;   // stop when settled
}
```

- **Exponential smoothing** (followers, magnetic effects): `x += (target - x) * (1 - Math.exp(-dt / tau))`. A per-frame `lerp(x, target, 0.1)` equals tau of about 158 ms, but only at 60 Hz. tau = 100 ms reaches 86.5% of the way after 200 ms at any refresh rate.
- **Friction decay** after a flick: `v *= Math.pow(f, dt * 60)`, not `v *= f` per frame. With f = 0.95 the time constant is about 325 ms; a naive per-frame decay coasts half as far on a 120 Hz screen.
- *(standard)* **Projection**, to choose a snap target from a flick: resting point = (v in px/s / 1000) * r / (1 - r), with r = 0.998 per ms. At 1000 px/s it lands about 499 px away.
- Budget frames at the display's rate: 16.7 ms at 60 Hz, 8.3 ms at 120 Hz.

## Springs

*(standard)* A damped spring obeys m x'' = -k (x - target) - c x'.

| Quantity | Formula |
| --- | --- |
| Natural frequency | w0 = sqrt(k / m) |
| Damping ratio | zeta = c / (2 sqrt(k m)); below 1 bounces, 1 is critical (fastest with no overshoot) |
| Overshoot | exp(-pi zeta / sqrt(1 - zeta^2)) |
| Settle time (2%) | about 4 / (zeta w0) = 8 m / c for an underdamped spring |

- Settle time depends on damping and mass, not stiffness. To add bounce, lower the damping ratio; raising stiffness alone only adds bounce at fixed damping.
- Motion's defaults (stiffness 100, damping 10, mass 1) give zeta = 0.5: about 16% overshoot and roughly 0.8 s to settle.
- Motion's duration-based springs set the damping ratio to 1 - bounce (the SwiftUI convention), so `bounce: 0.2` means zeta = 0.8 (verified in `motion-dom` source, `bounceToDampingRatio`).
- A hand-rolled per-frame spring `v = (v - k*(x - target)) * d; x += v` is frame-rate dependent. At 60 Hz it maps to stiffness of about 3600 k and damping of about -60 ln d; convert it before reuse.

## Large zooms

Something approaching in depth grows slowly while far and fast when near, so a linear scale from 0.5 to 2 reads as braking. For zooms of 2x or more, add a midpoint at the geometric mean sqrt(a b) (here 1.0, not 1.25), or animate in log space:

```js
animate(el, { scale: [0.5, 1, 2] }, { times: [0, 0.5, 1] })
```

## Waves, orbits, and angles

- Wave: y_i(t) = A sin(w t + i phi). As a CSS delay, a phase step phi per item is `delay_i = -i * (phi / 2pi) * period`; negative delays start every item mid-cycle with no idle frame.
- Orbit: x = cx + r cos(theta), y = cy + r sin(theta). Without trig: `transform: rotate(var(--a)) translateX(100px) rotate(calc(-1 * var(--a)))` (order matters).
- Pointing: theta = atan2(dy, dx); screen y points down, so angles grow clockwise. Unwrap to stop the 359 to 0 spin: `let d = a - prev; d -= 360 * Math.round(d / 360); rot += d; prev = a;`

## Parallax, rubber band, wrap, and fluid distance

- **Parallax factor k**: a layer translated by -k times the scroll distance appears to move at k times content speed. Below 1 reads farther, above 1 nearer, 0 is fixed. Drive it with a scroll timeline and a pixel `animation-range`, and drop it under reduced motion.
- *(standard)* **Rubber band**: displayed = (1 - 1 / (x c / d + 1)) d, with overscroll x, container dimension d, and c of about 0.55. With d = 400, overscrolls of 100, 400, and 2000 px display as 48, 142, and 293 px.
- **True modulo** for wrapping indices backwards: `((a % n) + n) % n`. CSS `mod()` takes the divisor's sign; `rem()` and JS `%` take the dividend's.
- **Fluid travel distance**: slope m = (v_max - v_min) / (w_max - w_min), intercept b = v_min - m w_min, then `clamp(v_min, calc(b + m * 100vw), v_max)`. From 4 px at 320 px wide to 28 px at 1280 px: `clamp(0.25rem, calc(2.5vw - 0.25rem), 1.75rem)`. Slide-ins then travel less on small screens.

## Memory

*(standard)* A composited layer costs about width x height x DPR^2 x 4 bytes: a 1440 by 900 layer at 2x is about 20 MB. Size layers to their artwork; past a few hundred moving objects, use canvas.
