// web/src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "leaflet/dist/leaflet.css"; // ← required for react-leaflet markers/tiles
import App from "./App.jsx";

document.title = "Chandrapur Real Estate";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
