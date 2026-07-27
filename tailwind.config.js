/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: {
          950: '#0B1220',
          900: '#111A2E',
          800: '#182338',
          700: '#22304A',
        },
        brand: {
          500: '#2DD4BF',
          600: '#14B8A6',
          700: '#0F9488',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 6px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [],
}
