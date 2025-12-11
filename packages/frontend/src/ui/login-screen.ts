import { navigateTo } from "../app";

export function createLoginScreen(): HTMLElement {
  const container = document.createElement("section");

  container.className = `
    w-full 
    h-screen 
    bg-purple-900 
    flex 
    flex-col 
    items-center 
    justify-center
    text-purple-200
  `;

  container.innerHTML = `
    <h2 class="text-3xl font-bold mb-8">Welcome to Ping-Pong</h2>

    <div id="warning" class="text-red-300 mb-2 text-sm"></div>

    <div class="
      bg-purple-800 
      p-6 
      rounded-xl 
      shadow-lg 
      w-80
      flex 
      flex-col 
      gap-4
    ">
      <input
        id="usernameInput"
        type="text"
        placeholder="Username"
        class="
          p-2 
          rounded 
          bg-purple-700 
          border border-purple-600 
          text-purple-100
          placeholder-purple-300
          focus:outline-none
          focus:ring-2
          focus:ring-purple-400
        "
      />

      <input
        id="passwordInput"
        type="password"
        placeholder="Password"
        class="
          p-2 
          rounded 
          bg-purple-700 
          border border-purple-600 
          text-purple-100
          placeholder-purple-300
          focus:outline-none
          focus:ring-2
          focus:ring-purple-400
        "
      />

      <button id="loginBtn" class="
        mt-2 
        bg-purple-600 
        hover:bg-purple-500 
        text-purple-100
        p-2 
        rounded
        transition
      ">
        Login
      </button>

      <div class="flex justify-between mt-2 text-sm">
        <button class="hover:underline">Create account</button>
        <button class="hover:underline">Forgot your password?</button>
      </div>
    </div>
  `;

  // Logica del login de prueba
  const loginBtn = container.querySelector("#loginBtn") as HTMLButtonElement;
  const userInput = container.querySelector("#usernameInput") as HTMLInputElement;
  const passInput = container.querySelector("#passwordInput") as HTMLInputElement;
  const warningLabel = container.querySelector("#warning") as HTMLElement;

  loginBtn.addEventListener("click", () => {
    const user = userInput.value.trim();
    const pass = passInput.value.trim();

    if (user === "" || pass === "") {
      warningLabel.textContent = "Please fill both fields.";
      return;
    }

    if (user === "test" && pass === "test") {
      navigateTo("home");
    } else {
      warningLabel.textContent = "Incorrect username or password.";
    }
  });

  return container;
}
