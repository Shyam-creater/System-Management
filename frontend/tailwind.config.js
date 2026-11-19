/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#1d68ff',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a'
        },
        primary: {
          DEFAULT: '#1d68ff',
          hover: '#1557e0',
          light: '#eff6ff'
        },
        healthy: '#10b981',
        warning: '#f59e0b',
        critical: '#ef4444',
        info: '#3b82f6',
        surface: '#ffffff'
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      }
    },
  },
  plugins: [],
}
