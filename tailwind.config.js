/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
          950: '#042F2E',
        },
        accent: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        status: {
          approved: '#059669',
          approvedSoft: '#ECFDF5',
          pending: '#D97706',
          pendingSoft: '#FFFBEB',
          rejected: '#DC2626',
          rejectedSoft: '#FEF2F2',
          info: '#2563EB',
          infoSoft: '#EFF6FF',
          entry: '#059669',
          exit: '#DC2626',
        },
        surface: {
          DEFAULT: '#F7FAFC',
          card: '#FFFFFF',
          muted: '#EEF2F6',
          border: '#E2E8F0',
        },
        ink: {
          DEFAULT: '#0F172A',
          soft: '#334155',
          muted: '#64748B',
          faint: '#94A3B8',
        },
      },
      fontFamily: {
        display: ['Manrope_700Bold', 'Manrope_600SemiBold', 'System'],
        heading: ['Manrope_600SemiBold', 'System'],
        sans: ['Manrope_400Regular', 'System'],
        medium: ['Manrope_500Medium', 'System'],
      },
      boxShadow: {
        card: '0px 4px 16px rgba(15, 23, 42, 0.06)',
        soft: '0px 2px 8px rgba(15, 23, 42, 0.05)',
      },
    },
  },
  plugins: [],
};
