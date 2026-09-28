/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Fonds : bleu nuit de la charte Epitech, du plus sombre au plus clair
        ink: {
          950: "#060B3D",
          900: "#0A1257",
          800: "#0F1B78",
          700: "#1B2B9C",
          600: "#2F41C4",
        },
        mist: "#BFC8FF", // texte secondaire
        danger: "#FF8A75",
        // Une couleur pleine par service : c'est elle qui identifie un widget
        tile: {
          weather: "#8FB0FF",
          crypto: "#FF5F3C",
          github: "#FF4DF0",
          rss: "#00FF9C",
          other: "#BFC8FF",
        },
      },
      fontFamily: {
        display: ["Anton", "Impact", '"Arial Narrow"', "sans-serif"],
        body: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
