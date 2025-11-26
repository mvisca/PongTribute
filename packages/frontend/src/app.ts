import { createLoginScreen } from "./ui/login-screen";

export function setupApp() {
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = "";

  const login = createLoginScreen();

  app.appendChild(login);
}

