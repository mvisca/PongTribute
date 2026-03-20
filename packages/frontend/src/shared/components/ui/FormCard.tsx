import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
	title: string;
	wide?: boolean;
}

export default function FormCard({ children, title, wide = false }: Props) {
  return (
     <div className={`bg-purple-950 p-8 rounded-xl shadow-lg ${wide ? 'w-full max-w-[900px]' : 'w-full sm:w-[420px]'}`}>
		  <h1 className='retro-title mb-6'>{title}</h1>
      {children}
    </div>
  );
}
