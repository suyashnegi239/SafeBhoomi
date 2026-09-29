import "maplibre-gl/dist/maplibre-gl.css";
import { SafeBhoomiErrorBoundary } from "./SafeBhoomiErrorBoundary";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SafeBhoomiErrorBoundary>
      <>
      <App />
      
    </>
    </SafeBhoomiErrorBoundary>
  </React.StrictMode>
);
