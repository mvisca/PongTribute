// src/ui/screen-manager.ts
import { createLoginScreen } from "./login-screen";
import { createRegisterScreen } from "./register-screen";
import { createForgotPasswordScreen } from "./forgot-password-screen";

/**
 * Inserta un mensaje de error (estilizado) en el placeholder indicado.
 * Si message === '' elimina el mensaje.
 */
function showInlineError(placeholder: HTMLElement | null, message: string) {
  if (!placeholder) return;
  placeholder.innerHTML = ""; // limpiar
  if (!message) return;

  const err = document.createElement("div");
  err.className = `
    bg-purple-700 
    text-purple-100 
    px-3 py-2 
    rounded 
    text-sm 
    text-center
  `;
  err.textContent = message;
  placeholder.appendChild(err);
}

/** Mount utilities */
function mount(container: HTMLElement) {
  const app = document.getElementById("app");
  if (!app) return;
  app.innerHTML = "";
  app.appendChild(container);
}

/** Show login screen and attach handlers */
export function showLoginScreen() {
  const screen = createLoginScreen();
  mount(screen);

  // placeholders
  const errorPlaceholder = document.getElementById("login-error-placeholder");

  // elements
  const usernameInput = screen.querySelector<HTMLInputElement>("#username")!;
  const passwordInput = screen.querySelector<HTMLInputElement>("#password")!;
  const loginBtn = screen.querySelector<HTMLButtonElement>("#login-btn")!;
  const createAccountBtn = screen.querySelector<HTMLButtonElement>("#create-account")!;
  const forgotPasswordBtn = screen.querySelector<HTMLButtonElement>("#forgot-password")!;

  // Reset any previous inline error
  showInlineError(errorPlaceholder, "");

  loginBtn.addEventListener("click", () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
      showInlineError(errorPlaceholder, "Please fill both username and password.");
      return;
    }

    // Aquí podríamos llamar al backend: fetch('/auth/login', { method: 'POST', body: JSON.stringify... })
    // Por ahora simulamos:
    showInlineError(errorPlaceholder, ""); // limpiar error
    alert(`Simulated login\nUsername: ${username}`);
  });

  createAccountBtn.addEventListener("click", () => {
    showRegisterScreen();
  });

  forgotPasswordBtn.addEventListener("click", () => {
    showForgotPasswordScreen();
  });
}

/** Show register screen and attach handlers */
export function showRegisterScreen() {
  const screen = createRegisterScreen();
  mount(screen);

  const errorPlaceholder = document.getElementById("register-error-placeholder");

  const usernameInput = screen.querySelector<HTMLInputElement>("#new-username")!;
  const emailInput = screen.querySelector<HTMLInputElement>("#new-email")!;
  const passwordInput = screen.querySelector<HTMLInputElement>("#new-password")!;
  const registerBtn = screen.querySelector<HTMLButtonElement>("#register-btn")!;
  const backLoginBtn = screen.querySelector<HTMLButtonElement>("#back-login")!;

  showInlineError(errorPlaceholder, "");

  registerBtn.addEventListener("click", () => {
    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !email || !password) {
      showInlineError(errorPlaceholder, "Please fill all fields (username, email, password).");
      return;
    }

    // Simulación: más adelante llamar al backend para crear cuenta
    showInlineError(errorPlaceholder, "");
    alert(`Simulated register\nUsername: ${username}\nEmail: ${email}`);
  });

  backLoginBtn.addEventListener("click", () => {
    showLoginScreen();
  });
}

/** Show forgot password screen and attach handlers */
export function showForgotPasswordScreen() {
  const screen = createForgotPasswordScreen();
  mount(screen);

  const errorPlaceholder = document.getElementById("forgot-error-placeholder");

  const emailInput = screen.querySelector<HTMLInputElement>("#fp-email")!;
  const sendBtn = screen.querySelector<HTMLButtonElement>("#send-reset")!;
  const backLoginBtn = screen.querySelector<HTMLButtonElement>("#back-login")!;

  showInlineError(errorPlaceholder, "");

  sendBtn.addEventListener("click", () => {
    const email = emailInput.value.trim();
    if (!email) {
      showInlineError(errorPlaceholder, "Please enter your email.");
      return;
    }
    // Simulación de envío
    showInlineError(errorPlaceholder, "");
    alert(`Simulated: reset link sent to ${email}`);
  });

  backLoginBtn.addEventListener("click", () => {
    showLoginScreen();
  });
}
