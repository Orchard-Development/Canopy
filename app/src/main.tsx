import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import "./index.css";

// When served through the CF Pages proxy the app lives at /connect/<id>/
// and React Router must treat that prefix as the basename.
const _proxyMatch = window.location.pathname.match(/^(\/connect\/[^/]+)\//);
const basename = _proxyMatch ? _proxyMatch[1] : "";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
