import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { applyTheme, getStoredTheme } from "./app/theme";
import "./styles/index.css";

applyTheme(getStoredTheme());

createRoot(document.getElementById("root")!).render(<App />);
