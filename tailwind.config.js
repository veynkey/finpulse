/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        surface: '#111111',
        border: '#2a2a2a',
        text: '#eaeaea',
        muted: '#888888',
        accent: '#2962ff',
        up: '#00c853',
        down: '#ff3d00'
      }
    },
  },
  plugins: [],
}
