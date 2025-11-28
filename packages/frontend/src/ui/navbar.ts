export function createNavbar(): HTMLElement 
{
  const nav = document.createElement("nav");

  nav.className = `
    w-full 
    bg-gray-800 
    px-4 
    py-3 
    flex 
    justify-between 
    items-center 
    shadow-md 
    border-b border-gray-700
  `;

  nav.innerHTML = `
    <h1 class="text-xl font-bold">Transcendence</h1>
    <button class="
      px-3 py-1 
      rounded 
      bg-blue-600 
      hover:bg-blue-500 
      transition
    ">
      Login
    </button>
  `;

  return nav;
}

//crea un componente de barra de navegación (navbar) que puedes reutilizar en diferentes 
// partes de tu aplicación.
