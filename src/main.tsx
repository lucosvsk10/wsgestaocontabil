
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeUserData } from './data/users.ts'

// Initialize user data immediately when the application loads
// This ensures the predefined users are available before any component mounts
initializeUserData();
console.log("Main: User data initialized on app start");

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        const badge = document.querySelector("#lovable-badge");
        if (badge) badge.remove();
    }, 20); // Espera 0.01 segundo para garantir que ele seja removido
});

createRoot(document.getElementById("root")!).render(<App />);
