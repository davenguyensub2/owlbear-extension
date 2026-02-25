/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: "#242424",
        sidebar: "#1a1a1a",
        accent: "#ffcc00",
      }
    },
  },
  plugins: [],
}