import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      colors: { brand: { DEFAULT: "#123456", 50: "#f0f0ff" } },
      fontSize: {
        sm: ["0.875rem", { lineHeight: "1.25rem", letterSpacing: "0.01em" }],
        base: ["1rem", "1.5rem"],
      },
      fontFamily: { sans: ["Inter", "Open Sans", "sans-serif"] },
      borderRadius: { lg: "0.5rem" },
    },
  },
} satisfies Config;
