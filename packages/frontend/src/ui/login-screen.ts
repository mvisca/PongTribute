// src/ui/login-screen.ts
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
    <h2 class="text-4xl font-extrabold mb-6 drop-shadow-lg text-center">
      Welcome to Ping-Pong
    </h2>

    <!-- Aquí se insertará el mensaje de error si hace falta -->
    <div id="login-error-placeholder" class="w-80 mb-2"></div>

    <!-- Login Card -->
    <div id="login-card" class="
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

      <button id="login-btn" class="
          mt-3 
          bg-purple-600 
          hover:bg-purple-500 
          text-purple-100
          p-2 
          rounded
          font-semibold
          transition
        ">
        Login
      </button>

      <div class="mt-4 flex flex-col text-center text-sm gap-1">
        <button id="create-account" class="hover:underline">Create account</button>
        <button id="forgot-password" class="hover:underline">Forgot your password?</button>
      </div>
    </div>
  `;

  return container;
}
