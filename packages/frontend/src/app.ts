import { createLoginScreen } from "./ui/login-screen";
import { createHomeScreen } from "./ui/home-screen";

export function setupApp() {
  navigateTo("login");
}

// Navegación global entre pantallas
export function navigateTo(screen: "login" | "home") {
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = "";

  let screenElement: HTMLElement;

  if (screen === "login") {
    screenElement = createLoginScreen();
  } else {
    screenElement = createHomeScreen();
  }

  app.appendChild(screenElement);
}

//Este archivo crea las pantallas que luego se ven en el navegador
//Este archivo inicializa la app: Encuentra el container principal, lo vacia y crea la primera paguina
//(en este caso login) e inserta esa paguina en la pantalla