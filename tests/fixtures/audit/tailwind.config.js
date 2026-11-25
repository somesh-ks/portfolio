// tailwind.config.js: the whole design system. Usage notes at the bottom.
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#0ea5e9", dark: "#0369a1", fg: "#ffffff" },
        ink: { DEFAULT: "#0f172a", muted: "#64748b", faint: "#94a3b8" },
        canvas: "#ffffff",
        panel: "#f1f5f9",
        line: "#e2e8f0",
        success: "#22c55e",
        danger: "#e11d48",
      },
      fontSize: {
        xs: ["11px", "16px"],
        sm: ["13px", "20px"],
        base: ["15px", "24px"],
        lg: ["18px", "28px"],
        "2xl": ["24px", "32px"],
        "4xl": ["36px", "40px"],
      },
    },
  },
};

// Usage, from components/:
//   <button class="bg-brand text-brand-fg hover:bg-brand-dark focus:ring-2 focus:ring-brand">
//   <p class="text-ink-muted"> on bg-canvas and on bg-panel
//   <time class="text-xs text-ink-faint"> on bg-canvas
//   <span class="text-success">Saved</span> on bg-canvas
//   <p class="text-danger"> on bg-canvas
// There is no dark mode.
