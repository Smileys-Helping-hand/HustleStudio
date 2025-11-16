/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          500: '#D4C19C',
          600: '#BFA982',
          700: '#9C8661',
        },
        gold: '#D4C19C',
        olive: '#68785C',
        linen: '#F7F7F5',
      },
    },
  },
  plugins: [],
};
