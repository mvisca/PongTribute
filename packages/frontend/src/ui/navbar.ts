export function createNavbar(): HTMLElement //funcion que construye un menú de navegación(no dibuja nada en la pantalla solo construye el elemento)
{
  const nav = document.createElement("nav");//crea elemento <nav> en la memoria
//asigna clases de Tailwind CSS al <nav> para darle estilo
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
//agregamos contenido dentro del <nav> usando innerHTML
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

//Es un componente visual: HTML + estilos con Tailwind.
//Devuelve un elemento HTML (HTMLElement) que luego puedes agregar a la página.
//No hace lógica complicada: solo estructura y estilo.
