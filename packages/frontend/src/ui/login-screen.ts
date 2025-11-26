export function createLoginScreen(): HTMLElement {
  const container = document.createElement("section");

  // Full screen container with dark purple background and light purple text
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

      <button class="
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
    </div>
  `;

  return container;
}

