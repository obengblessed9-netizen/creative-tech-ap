import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyHomeSettings } from "./components/HomeSettings";

applyHomeSettings();

createRoot(document.getElementById("root")!).render(<App />);
