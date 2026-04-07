/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // <-- Phải có dòng này để Tailwind biết tìm class ở đâu
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}