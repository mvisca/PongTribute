// src/ui/forgot-password-screen.ts
export function createForgotPasswordScreen(): HTMLElement {
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
    <h2 class="text-3xl font-bold mb-6 text-center">Forgot Password</h2>

    <div id="forgot-error-placeholder" class="w-80 mb-2"></div>

    <div id="forgot-card" class="bg-purple-800 p-6 rounded-xl shadow-lg w-80 flex flex-col gap-4">
      <input type="email" id="fp-email" placeholder="Email"
        class="p-2 rounded bg-purple-700 border border-purple-600 text-purple-100 placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400"/>
      <button id="send-reset" class="mt-2 bg-purple-600 hover:bg-purple-500 text-purple-100 p-2 rounded transition">Send Reset Link</button>
      <button id="back-login" class="mt-2 text-sm underline hover:text-purple-300">Back to Login</button>
    </div>
  `;

  return container;
}
