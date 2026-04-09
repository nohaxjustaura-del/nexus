import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        slideInUp: {
          from: {
            opacity: "0",
            transform: "translateY(20px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        slideInDown: {
          from: {
            opacity: "0",
            transform: "translateY(-20px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        "chevron-bounce": {
          "0%, 100%": { transform: "translateY(0)", opacity: "0.55" },
          "50%": { transform: "translateY(4px)", opacity: "1" },
        },
        /** Home "How it works" — vertical line highlight (one pass per cycle; % tuned to node glow) */
        "home-step-snake": {
          "0%, 2%": { transform: "translate(-50%, -180%)", opacity: "0" },
          "4%": { opacity: "1" },
          "20%": { transform: "translate(-50%, 420%)", opacity: "1" },
          "24%, 100%": { opacity: "0", transform: "translate(-50%, 420%)" },
        },
        /** Chevron ring: slow peak when snake passes (no transform — fast breathe runs on inner icon) */
        "home-step-node": {
          "0%, 3%": {
            opacity: "0.52",
            borderColor: "hsl(var(--border) / 0.35)",
            color: "hsl(var(--muted-foreground) / 0.55)",
            boxShadow: "0 0 0 0 hsl(var(--primary) / 0)",
          },
          "8%, 18%": {
            opacity: "1",
            borderColor: "hsl(var(--primary) / 0.55)",
            color: "hsl(var(--primary))",
            boxShadow: "0 0 18px 2px hsl(var(--primary) / 0.24), 0 0 32px 4px hsl(var(--primary) / 0.09)",
          },
          "24%, 100%": {
            opacity: "0.52",
            borderColor: "hsl(var(--border) / 0.35)",
            color: "hsl(var(--muted-foreground) / 0.55)",
            boxShadow: "0 0 0 0 hsl(var(--primary) / 0)",
          },
        },
        /** Fast continuous breathe on chevron icon (layered with slow home-step-node on parent) */
        "home-step-breathe-fast": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.88" },
          "50%": { transform: "scale(1.09)", opacity: "1" },
        },
        /** Fast pulse on vertical rail background only */
        "home-step-line-breathe": {
          "0%, 100%": { opacity: "0.42" },
          "50%": { opacity: "0.92" },
        },
        "trend-nudge": {
          "0%, 100%": { transform: "translate(0, 0)", opacity: "0.88" },
          "50%": { transform: "translate(2px, -2px)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-up": "slideInUp 0.5s ease-out",
        "slide-down": "slideInDown 0.5s ease-out",
        "fade-in": "fadeIn 0.6s ease-out",
        "shimmer": "shimmer 2s infinite",
        "chevron-bounce": "chevron-bounce 1.6s ease-in-out infinite",
        "trend-nudge": "trend-nudge 1.6s ease-in-out infinite",
        "home-step-snake": "home-step-snake 3.5s linear infinite",
        "home-step-node": "home-step-node 3.5s linear infinite",
        "home-step-breathe-fast": "home-step-breathe-fast 0.5s ease-in-out infinite",
        "home-step-line-breathe": "home-step-line-breathe 0.5s ease-in-out infinite",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
