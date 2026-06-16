import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import styles from "./styles.css";

const styleElement = document.createElement("style");
styleElement.textContent = styles;
document.head.appendChild(styleElement);

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

