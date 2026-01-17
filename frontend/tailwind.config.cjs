/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Semantic color tokens
        // Surfaces
        surface: {
          base: "rgb(var(--color-surface-base) / <alpha-value>)",
          elevated: "rgb(var(--color-surface-elevated) / <alpha-value>)",
          overlay: "rgb(var(--color-surface-overlay) / <alpha-value>)",
        },
        // Borders
        border: {
          DEFAULT: "rgb(var(--color-border) / <alpha-value>)",
          muted: "rgb(var(--color-border-muted) / <alpha-value>)",
        },
        // Text
        content: {
          DEFAULT: "rgb(var(--color-content) / <alpha-value>)",
          muted: "rgb(var(--color-content-muted) / <alpha-value>)",
          subtle: "rgb(var(--color-content-subtle) / <alpha-value>)",
          inverse: "rgb(var(--color-content-inverse) / <alpha-value>)",
        },
        // Interactive
        accent: {
          DEFAULT: "rgb(var(--color-accent) / <alpha-value>)",
          hover: "rgb(var(--color-accent-hover) / <alpha-value>)",
          muted: "rgb(var(--color-accent-muted) / <alpha-value>)",
          text: "rgb(var(--color-accent-text) / <alpha-value>)",
        },
        // Feedback
        success: {
          DEFAULT: "rgb(var(--color-success) / <alpha-value>)",
          muted: "rgb(var(--color-success-muted) / <alpha-value>)",
          text: "rgb(var(--color-success-text) / <alpha-value>)",
        },
        error: {
          DEFAULT: "rgb(var(--color-error) / <alpha-value>)",
          muted: "rgb(var(--color-error-muted) / <alpha-value>)",
          text: "rgb(var(--color-error-text) / <alpha-value>)",
        },
      },
      borderRadius: {
        // Consistent radius scale
        card: "1rem", // 16px - for cards/sections
        input: "0.5rem", // 8px - for inputs/buttons
        pill: "9999px", // full - for pills/tags
      },
      spacing: {
        // Touch target minimum
        touch: "2.75rem", // 44px
      },
      fontSize: {
        // Type scale with line heights
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
      },
      boxShadow: {
        card: "0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)",
      },
      animation: {
        "pulse-slow": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

