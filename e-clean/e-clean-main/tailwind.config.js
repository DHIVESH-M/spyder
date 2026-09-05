/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#1c1b1a',
          soft: '#3a3835',
          muted: '#6b6864',
        },
        paper: {
          DEFAULT: '#faf9f7',
          card: '#ffffff',
          line: '#e8e5e0',
          warm: '#f4f1ec',
        },
        moss: {
          50: '#f3f7f2',
          100: '#e3eee0',
          200: '#c7ddc1',
          300: '#9cc193',
          400: '#6fa063',
          500: '#4f8246',
          600: '#3d6a37',
          700: '#33562e',
          800: '#2b4627',
          900: '#243a22',
        },
        clay: {
          400: '#d9a96a',
          500: '#c89048',
          600: '#a87332',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(28, 27, 26, 0.04), 0 1px 3px rgba(28, 27, 26, 0.06)',
        lift: '0 2px 6px rgba(28, 27, 26, 0.06), 0 4px 12px rgba(28, 27, 26, 0.05)',
      },
      borderRadius: {
        DEFAULT: '6px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        'fade-in': 'fade-in 0.4s ease-out both',
        'scan-line': 'scan-line 1.6s ease-in-out infinite alternate',
      },
    },
  },
  plugins: [],
};
