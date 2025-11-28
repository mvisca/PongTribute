import { createLoginScreen } from "./ui/login-screen";

export function setupApp() {
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = "";

  const login = createLoginScreen();

  app.appendChild(login);
}

//Este archivo crea las pantallas que luego se ven en el navegador
//Este archivo inicializa la app: Encuentra el container principal, lo vacia y crea la primera paguina
//(en este caso login) e inserta esa paguina en la pantalla