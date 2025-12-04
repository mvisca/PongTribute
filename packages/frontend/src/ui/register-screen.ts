import { createLoginScreen } from "./login-screen";

export function createRegisterScreen(): HTMLElement {
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
    <h2 class="text-3xl font-bold mb-6 text-center">Create Account</h2>

    <div class="bg-purple-800 p-6 rounded-xl shadow-lg w-80 flex flex-col gap-4">
      <input type="text" id="new-username" placeholder="Username" class="p-2 rounded bg-purple-700 border border-purple-600 text-purple-100 placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400"/>
      <input type="email" id="new-email" placeholder="Email" class="p-2 rounded bg-purple-700 border border-purple-600 text-purple-100 placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400"/>
      <input type="password" id="new-password" placeholder="Password" class="p-2 rounded bg-purple-700 border border-purple-600 text-purple-100 placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400"/>
      <button id="register-btn" class="mt-2 bg-purple-600 hover:bg-purple-500 text-purple-100 p-2 rounded transition">Register</button>
      <button id="back-login" class="mt-2 text-sm underline hover:text-purple-300">Back to Login</button>
    </div>
  `;

  // Eventos
  const registerBtn = container.querySelector<HTMLButtonElement>("#register-btn")!;
  const backLoginBtn = container.querySelector<HTMLButtonElement>("#back-login")!;

  registerBtn.addEventListener("click", () => {
    const username = (container.querySelector<HTMLInputElement>("#new-username")!).value.trim();
    const email = (container.querySelector<HTMLInputElement>("#new-email")!).value.trim();
    const password = (container.querySelector<HTMLInputElement>("#new-password")!).value.trim();

    if (!username || !email || !password) {
      alert("Please fill all fields");
      return;
    }

    alert(`Account created!\nUsername: ${username}\nEmail: ${email}\nPassword: ${password}`);
  });

  // ✅ Volver a login
  backLoginBtn.addEventListener("click", () => {
    const app = document.getElementById("app");
    if (!app) return;
    app.innerHTML = "";
    app.appendChild(createLoginScreen());
  });

  return container;
}

