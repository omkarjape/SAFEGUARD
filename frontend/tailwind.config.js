/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        industrial: {
          bg: '#0b0f19',
          surface: '#111827',
          card: '#151e2e',
          border: '#1f293d',
          hover: '#1a2538',
          text: '#f3f4f6',
          muted: '#9ca3af'
        },
        safety: {
          safe: '#10b981',
          warning: '#f59e0b',
          critical: '#ef4444',
          offline: '#64748b',
          info: '#3b82f6'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
