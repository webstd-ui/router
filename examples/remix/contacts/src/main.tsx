import { createRoot } from "@remix-run/dom";
import { App } from "./app.tsx";
import "./index.css";

navigator.serviceWorker.register("/worker.js", { type: "module" });

createRoot(document.body).render(<App />);
