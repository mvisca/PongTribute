import { createRegisterScreen } from "./register-screen";
import { createForgotPasswordScreen } from "./forgot-password-screen";

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
    px-4
  `;

  container.innerHTML = `
    <h2 class="text-4xl font-extrabold mb-10 drop-shadow-lg text-center">
      Welcome to Ping-Pong
    </h2>

    <div class="
      bg-purple-800 
      p-6 
      rounded-2xl 
      shadow-2xl 
      w-80
      flex 
      flex-col 
      gap-4
    ">

      <div class="flex flex-col">
        <label class="mb-1 text-sm">Username</label>
        <input
          id="username"
          type="text"
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
          placeholder="Enter your username"
        />
      </div>

      <div class="flex flex-col">
        <label class="mb-1 text-sm">Password</label>
        <input
          id="password"
          type="password"
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
          placeholder="Enter your password"
        />
      </div>

      <button
        id="login-btn"
        class="
          mt-3 
          bg-purple-600 
          hover:bg-purple-500 
          text-purple-100
          p-2 
          rounded
          font-semibold
          transition
        "
      >
        Login
      </button>

      <div class="mt-4 flex flex-col text-center text-sm gap-1">
        <button id="create-account" class="hover:underline">
          Create account
        </button>
        <button id="forgot-password" class="hover:underline">
          Forgot your password?
        </button>
      </div>
    </div>
  `;

  // --- EVENTOS ---
  const usernameInput = container.querySelector<HTMLInputElement>("#username")!;
  const passwordInput = container.querySelector<HTMLInputElement>("#password")!;
  const loginBtn = container.querySelector<HTMLButtonElement>("#login-btn")!;
  const createAccountBtn = container.querySelector<HTMLButtonElement>("#create-account")!;
  const forgotPasswordBtn = container.querySelector<HTMLButtonElement>("#forgot-password")!;

  //Validación Login
  loginBtn.addEventListener("click", () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
      alert("Please enter both username and password");
      return;
    }

    //Aquí simulamos login exitoso
    alert(`Login successful!\nUsername: ${username}\nPassword: ${password}`);
  });

  //Cambiar a pantalla de registro
  createAccountBtn.addEventListener("click", () => {
    const app = document.getElementById("app");
    if (!app) return;
    app.innerHTML = "";
    app.appendChild(createRegisterScreen());
  });

  //Cambiar a pantalla de "forgot password"
  forgotPasswordBtn.addEventListener("click", () => {
    const app = document.getElementById("app");
    if (!app) return;
    app.innerHTML = "";
    app.appendChild(createForgotPasswordScreen());
  });

  return container;
}
