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
        profit: '#22c55e',
        loss: '#ef4444',
        dark: {
          bg: '#0f1117',
          card: '#1a1d29',
          border: '#2a2d3a',
          text: '#e2e8f0',
          muted: '#94a3b8',
        }
      }
    },
  },
  plugins: [],
}