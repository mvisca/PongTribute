import tailwindcss from "@tailwindcss/postcss";
import autoprefixer from "autoprefixer";
import postcssNested from 'postcss-nested';

export default {
  plugins: [
	postcssNested(),
    tailwindcss(),
    autoprefixer(),
  ],
};

//Archivo usado como herramienta que procesa CSS antes de que llegue al navegador.
//Lo usa Vite para correr Tailwind.

//Le dice al build system
//1. Corre tailwindcss
//2. Corre autoprefixer
