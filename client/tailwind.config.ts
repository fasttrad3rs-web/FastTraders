import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * Fast Traders design system.
 *
 * All colours resolve through CSS variables declared in `src/app/globals.css`
 * so that shadcn/ui semantic tokens and the raw brand palette stay in sync and
 * a future dark theme is a variable swap rather than a config rewrite.
 *
 * Brand palette (source of truth):
 *   navy    #1B2A6B   cyan   #00AEEF
 *   dark    #0F1B4C   bg     #F7F9FC
 *   ink     #1A1A1A   muted  #5A6472
 */
const config: Config = {
  darkMode: ['class'],
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
    './src/hooks/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem' },
      // Single max width at every breakpoint — the industrial-catalogue look
      // wants a wide, dense grid rather than a narrow reading column.
      screens: { sm: '1400px', md: '1400px', lg: '1400px', xl: '1400px', '2xl': '1400px' },
    },
    extend: {
      colors: {
        /* ---------------- Brand palette ---------------- */
        brand: {
          navy: 'hsl(var(--brand-navy))',
          cyan: 'hsl(var(--brand-cyan))',
          dark: 'hsl(var(--brand-dark))',
          muted: 'hsl(var(--brand-muted))',
          ink: 'hsl(var(--brand-ink))',
          surface: 'hsl(var(--brand-surface))',
        },

        /* ------------- shadcn/ui semantic tokens ------------- */
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },

      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, hsl(var(--brand-dark)) 0%, hsl(var(--brand-navy)) 100%)',
        'brand-gradient-r': 'linear-gradient(90deg, hsl(var(--brand-dark)) 0%, hsl(var(--brand-navy)) 100%)',
      },

      fontFamily: {
        /* Body copy */
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        /* Headings — industrial, tight, slightly uppercase-leaning */
        heading: ['var(--font-poppins)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        // Technical UI needs a tight small size for spec tables / part numbers.
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },

      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      /* Soft, low-spread shadows — depth without the drop-shadow "app" look. */
      boxShadow: {
        soft: '0 1px 2px 0 rgb(27 42 107 / 0.05)',
        card: '0 1px 2px 0 rgb(27 42 107 / 0.04), 0 4px 16px -4px rgb(27 42 107 / 0.10)',
        'card-hover': '0 2px 4px 0 rgb(27 42 107 / 0.06), 0 12px 28px -6px rgb(27 42 107 / 0.16)',
        panel: '0 8px 40px -12px rgb(15 27 76 / 0.22)',
        focus: '0 0 0 3px hsl(var(--brand-cyan) / 0.35)',
      },
      maxWidth: { container: '1400px' },
      /*
       * `drawer` is deliberately gone.
       *
       * It sat at 60, below the modal overlay at 70 — so any drawer using it
       * rendered *behind* the overlay and had the overlay's tint and
       * `backdrop-blur` applied to itself. Radix portals the overlay and the
       * panel as siblings, so both belong on `modal` and DOM order does the
       * layering. A separate, lower drawer level only invites that bug back.
       */
      zIndex: { header: '50', modal: '70', toast: '80' },

      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in-up': 'fade-in-up 0.35s ease-out both',
        'slide-down': 'slide-down 0.18s ease-out both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [animate],
};

export default config;
