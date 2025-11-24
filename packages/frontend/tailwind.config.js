/** @type {import('tailwindcss').Config} */
export default 
{
  content: //de donde saca el contenido
  [
    "./index.html", 
    "./src/**/*.{ts,js}" //mira dentro de src cualquier archivo acabado en .ts o .js
  ],
  theme: //nos permite añadir colores personalizados, animaciones ...
  {
    extend: {},
  },
  plugins: [],//para en un futuro añadir tipografias, formularios ...
}
//✏️
//Tailwind necesita archivos de configuración, de tal manera sabe: 
//1. De donde coger el código HTML/TS.
//2. Que hacer con este contenido.
