/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{tsx,html}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        tribute: {
          orange: "#f97316",
          "orange-dark": "#ea580c"
        }
      }
    }
  }
}
