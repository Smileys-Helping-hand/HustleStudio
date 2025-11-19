/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          500: "#ff7f50",
          600: "#f75c34",
          700: "#d8471f",
        },
      },
    },
  },
  plugins: [],
};
