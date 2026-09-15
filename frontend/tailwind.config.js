/**
 * BuildFlow design tokens.
 * Palette: cool graphite ink + blueprint-paper canvas, a deep emerald
 * "signal" as the brand/action/success color, muted violet for
 * secondary/in-progress states, warm amber for caution, and a mature
 * red-coral for critical/danger. Hairline borders, modest radius —
 * no identical grey-shadow card kit, no cream-and-terracotta default.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#12151B',
          muted: '#5B6270',
          faint: '#949AA3',
        },
        paper: '#F2F3F5',
        surface: '#FFFFFF',
        line: '#E2E4E9',
        signal: {
          DEFAULT: '#0F9D74',
          dim: '#0A7A5A',
          faint: '#E1F6ED',
        },
        coral: {
          DEFAULT: '#E1493F',
          faint: '#FCEAE8',
        },
        amber: {
          DEFAULT: '#DB9A1F',
          faint: '#FBF1DD',
        },
        indigo: {
          DEFAULT: '#6C63D6',
          faint: '#EDEBFC',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(18, 21, 27, 0.05)',
        pop: '0 12px 32px -4px rgba(18, 21, 27, 0.18)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      backgroundImage: {
        'sidebar-gradient': 'linear-gradient(180deg, #171B22 0%, #12151B 100%)',
        'brand-gradient': 'linear-gradient(135deg, #0F9D74 0%, #0C8566 100%)',
      },
    },
  },
  plugins: [],
};
