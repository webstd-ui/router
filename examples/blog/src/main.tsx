import { createRoot } from "@remix-run/dom";
import { App } from "./App";

createRoot(document.getElementById("app")!).render(<App />);
