import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        const badge = document.querySelector("#lovable-badge");
        if (badge) badge.remove();
    }, 20); // Espera 0.01 segundo para garantir que ele seja removido
});

createRoot(document.getElementById("root")!).render(<App />);
