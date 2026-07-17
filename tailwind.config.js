/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--color-brand-soft-bg)',   // #E3F0EC
          100: 'var(--color-brand-soft)',      // #C8DDD8
          200: '#A8CBBF',
          300: '#7ABFAC',
          400: '#4FA094',
          500: '#2E7B68',
          600: '#1F4B3F',  // PRIMARY
          700: '#163830',
          800: '#0F2820',
          900: '#081A15',
          950: '#040D0A',
        },
        accent: {
          50: 'var(--color-accent-soft)',     // #FDEBD8
          100: '#FAD4B2',
          200: '#F4B080',
          300: '#EC8C52',
          400: '#E4823D',  // ACCENT
          500: '#C46B2B',
          600: '#A0551F',
          700: '#7A3F15',
        },
        charcoal: {
          DEFAULT: 'var(--color-charcoal)',
          soft: '#2E3532',
        },
        pastel: {
          mint: '#E3F0EC',
          peach: '#FDEBD8',
          sky: '#DDE8F4',
          rose: '#F8E4E4',
          butter: '#F9F0DC',
          lilac: '#EBE4F6',
          sage: '#E0EDEA',
          coral: '#FAE4DC',
        },
        status: {
          approved: '#1F4B3F',
          approvedSoft: 'var(--color-status-approved-soft)',
          pending: '#C4861A',
          pendingSoft: 'var(--color-status-pending-soft)',
          rejected: '#C0392B',
          rejectedSoft: 'var(--color-status-rejected-soft)',
          info: '#2563EB',
          infoSoft: 'var(--color-status-info-soft)',
          entry: '#1F4B3F',
          exit: '#C0392B',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          card: 'var(--color-surface-card)',
          muted: 'var(--color-surface-muted)',
          border: 'var(--color-surface-border)',
        },
        ink: {
          DEFAULT: 'var(--color-ink)',
          soft: 'var(--color-ink-soft)',
          muted: 'var(--color-ink-muted)',
          faint: 'var(--color-ink-faint)',
        },
      },
      fontFamily: {
        // Inter — 4-weight system
        display: ['Inter_700Bold', 'System'],
        heading: ['Inter_600SemiBold', 'System'],
        sans: ['Inter_400Regular', 'System'],
        medium: ['Inter_500Medium', 'System'],
      },
      fontSize: {
        // 4-level type scale per design spec
        'ds-display': ['32px', { lineHeight: '40px', letterSpacing: '-0.5px' }],
        'ds-heading': ['24px', { lineHeight: '32px', letterSpacing: '-0.3px' }],
        'ds-body': ['16px', { lineHeight: '24px' }],
        'ds-caption': ['13px', { lineHeight: '18px' }],
      },
      borderRadius: {
        // Per spec: 12px cards, 16px panels, no more "bubbly"
        card: '12px',
        panel: '16px',
        hero: '20px',
        modal: '28px',
        // Legacy aliases (keep for backward compat)
        soft: '16px',
        bubbly: '20px',
        pill: '999px',
      },
      boxShadow: {
        // Shadow-only elevation — no hairline borders
        'elevation-sm': '0px 2px 8px rgba(16, 21, 18, 0.06)',
        'elevation-md': '0px 4px 14px rgba(16, 21, 18, 0.08)',
        'elevation-lg': '0px 8px 24px rgba(16, 21, 18, 0.12)',
        // Legacy
        card: '0px 2px 8px rgba(16, 21, 18, 0.06)',
        soft: '0px 4px 14px rgba(16, 21, 18, 0.08)',
      },
    },
  },
  plugins: [],
};
