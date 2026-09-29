/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        night: "#070A1C", // fond : indigo très sombre, héritage du bleu Epitech
        smoke: "#0B0F26", // teinte de la vitre fumée
        frost: "#EEF1FF", // texte principal
        haze: "#A3ACCF", // texte secondaire (≥ 5,4:1 même vitre éclairée)
        iris: "#8FA2FF", // liens, focus
        alert: "#FF8A94", // erreurs
        // La lumière de chaque service, derrière sa vitre
        light: {
          sky: "#6CB8FF",
          ember: "#FFA657",
          orchid: "#C58CFF",
          aurora: "#4FE3B0",
        },
      },
      fontFamily: {
        sans: ['"Mona Sans Variable"', "system-ui", "-apple-system", '"Segoe UI"', "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
