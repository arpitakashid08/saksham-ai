import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./theme.css";   // shared design system (imports VT323 from Google Fonts)
import "./index.css";
import "./sign.css";
import "@fontsource/vt323"; // local fallback font
  
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);