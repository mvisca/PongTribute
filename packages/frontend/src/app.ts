// src/app.ts
import { showLoginScreen } from "./ui/screen-manager";

export function setupApp() {
  const app = document.getElementById("app");
  if (!app) return;

  // Inicializa directamente la pantalla de login
  showLoginScreen();
}

//Este archivo crea las pantallas que luego se ven en el navegador
//Este archivo inicializa la app: Encuentra el container principal, lo vacia y crea la primera paguina
//(en este caso login) e inserta esa paguina en la pantalla