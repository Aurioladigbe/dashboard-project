import React from "react";
import ReactDOM from "react-dom/client";
// Mona Sans avec son axe de largeur (75 % → 125 %) : titres et chiffres en largeur étendue
import "@fontsource-variable/mona-sans/wdth.css";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
