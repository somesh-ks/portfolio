/**
 * <claude-mascot>: a dependency-free custom element that renders the rect
 * model into its shadow root. Light-DOM children (a static SVG frame rendered
 * on the server) are the no-JS fallback and stay untouched, so React
 * hydration never fights the element.
 *
 * Attributes: animation="idle|wave|jump|blink|look", grid (boolean), paused (boolean).
 * Method: play(animation) runs one loop of an animation, then returns.
 */
import { ANIMATIONS, frame, GRID, LOOP_SECONDS, PART_FILL, type Animation } from "./mascot";

const SVG_NS = "http://www.w3.org/2000/svg";
const VIEW_TOP = -4;

function isAnimation(value: string | null): value is Animation {
  return value !== null && (ANIMATIONS as readonly string[]).includes(value);
}

export interface ClaudeMascotElement extends HTMLElement {
  play(animation: Animation): void;
}

/** The class is created lazily: HTMLElement does not exist on the server. */
function createElementClass() {
  return class extends HTMLElement implements ClaudeMascotElement {
    static observedAttributes = ["animation", "grid", "paused"];

    #svg: SVGSVGElement;
    #rects: SVGGElement;
    #grid: SVGGElement;
    #raf = 0;
    #start = 0;
    #visible = true;
    #oneShot: { animation: Animation; until: number } | null = null;
    #observer: IntersectionObserver | null = null;
    #motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent =
        ":host{display:block;aspect-ratio:16/18}svg{display:block;width:100%;height:100%;overflow:visible}.grid line{stroke:var(--illustration-grid);stroke-width:.04}.grid rect{fill:none;stroke:var(--text-accent);stroke-width:.06}";
      this.#svg = document.createElementNS(SVG_NS, "svg");
      this.#svg.setAttribute("viewBox", `0 ${VIEW_TOP} ${GRID.width} ${GRID.height - VIEW_TOP}`);
      this.#svg.setAttribute("shape-rendering", "crispEdges");
      this.#svg.setAttribute("aria-hidden", "true");
      this.#grid = document.createElementNS(SVG_NS, "g");
      this.#grid.setAttribute("class", "grid");
      this.#rects = document.createElementNS(SVG_NS, "g");
      this.#svg.append(this.#rects, this.#grid);
      root.append(style, this.#svg);
    }

    get animation(): Animation {
      const value = this.getAttribute("animation");
      return isAnimation(value) ? value : "idle";
    }

    // React 19 assigns props as properties when the element already defines
    // them (client navigation after the element is registered). Without a
    // setter that assignment throws and takes the whole page down.
    set animation(value: Animation) {
      this.setAttribute("animation", value);
    }

    play(animation: Animation): void {
      this.#oneShot = { animation, until: performance.now() + LOOP_SECONDS[animation] * 1000 };
      this.#start = performance.now();
      this.#loop();
    }

    connectedCallback() {
      this.#start = performance.now();
      this.#observer = new IntersectionObserver(([entry]) => {
        this.#visible = entry?.isIntersecting ?? true;
        this.#loop();
      });
      this.#observer.observe(this);
      this.#motion.addEventListener("change", this.#render);
      this.#loop();
    }

    disconnectedCallback() {
      cancelAnimationFrame(this.#raf);
      this.#observer?.disconnect();
      this.#motion.removeEventListener("change", this.#render);
    }

    attributeChangedCallback() {
      this.#start = performance.now();
      this.#loop();
    }

    #loop = () => {
      cancelAnimationFrame(this.#raf);
      this.#render();
      const animating =
        this.#visible && !this.hasAttribute("paused") && document.visibilityState === "visible";
      if (animating || this.#oneShot) this.#raf = requestAnimationFrame(this.#loop);
    };

    #render = () => {
      const now = performance.now();
      if (this.#oneShot && now > this.#oneShot.until) this.#oneShot = null;
      const animation = this.#oneShot?.animation ?? this.animation;
      const rects = frame(animation, (now - this.#start) / 1000, {
        reducedMotion: this.#motion.matches,
      });
      // Reuse nodes: same count every frame, so only attributes change.
      while (this.#rects.childElementCount < rects.length)
        this.#rects.append(document.createElementNS(SVG_NS, "rect"));
      rects.forEach((rect, index) => {
        const node = this.#rects.children[index] as SVGRectElement;
        node.setAttribute("x", String(rect.x));
        node.setAttribute("y", String(rect.y));
        node.setAttribute("width", String(rect.w));
        node.setAttribute("height", String(rect.h));
        node.setAttribute("fill", PART_FILL[rect.part]);
      });
      this.#renderGrid(rects);
    };

    #renderGrid(rects: ReturnType<typeof frame>) {
      if (!this.hasAttribute("grid")) {
        this.#grid.replaceChildren();
        return;
      }
      const lines: string[] = [];
      for (let x = 0; x <= GRID.width; x++)
        lines.push(`<line x1="${x}" y1="${VIEW_TOP}" x2="${x}" y2="${GRID.height}"/>`);
      for (let y = VIEW_TOP; y <= GRID.height; y++)
        lines.push(`<line x1="0" y1="${y}" x2="${GRID.width}" y2="${y}"/>`);
      const outlines = rects.map(
        (rect) => `<rect x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}"/>`,
      );
      // Static markup built from numbers only; no user input reaches it.
      this.#grid.innerHTML = lines.join("") + outlines.join("");
    }
  };
}

export function defineMascotElement(): void {
  if (!customElements.get("claude-mascot"))
    customElements.define("claude-mascot", createElementClass());
}
