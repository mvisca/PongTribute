export function createHomeScreen(): HTMLElement {
  const container = document.createElement("section");

  container.className = `
    p-6 
    flex 
    flex-col 
    items-center 
    justify-center
  `;

  container.innerHTML = `
    <h2 class="text-2xl font-bold mb-4">Welcome!</h2>
    
    <p class="text-gray-300 mb-6 text-center">
      This is your minimal UI.  
      You can now start adding modules, buttons, pages, and game screens.
    </p>

    <button class="
      px-4 py-2 
      bg-green-600 
      hover:bg-green-500 
      rounded 
      text-white 
      transition
    ">
      Play Game
    </button>
  `;

  return container;
}
