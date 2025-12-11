// src/ui/home-screen.ts
import { createLoginScreen } from "./login-screen";

export function createHomeScreen() {
  const container = document.createElement("div");
  container.className =
    "w-full h-full bg-purple-300 flex flex-col items-center justify-center relative";

  // ---- Botón Back ----
  const backButton = document.createElement("button");
  backButton.textContent = "← Back to Login";
  backButton.className =
    "absolute top-4 left-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition";
  backButton.addEventListener("click", () => {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = "";
    app.appendChild(createLoginScreen());
  });

  // ---- Zona de juego ----
  const gameBox = document.createElement("div");
  gameBox.className =
    "w-[400px] h-[250px] bg-purple-500 rounded-xl flex items-center justify-center text-white text-xl shadow-lg";
  gameBox.textContent = "Ping-Pong Game Area";

  // ---- Icono perfil ----
  const profileIcon = document.createElement("button");
  profileIcon.className =
    "absolute top-4 right-4 w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white hover:bg-purple-700";
  profileIcon.textContent = "👤";

  // ---- Botón traducir ----
  const translateButton = document.createElement("button");
  translateButton.className =
    "absolute bottom-4 right-4 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700";
  translateButton.textContent = "🌍 Translate";

  container.appendChild(backButton);
  container.appendChild(gameBox);
  container.appendChild(profileIcon);
  container.appendChild(translateButton);

  return container;
}
