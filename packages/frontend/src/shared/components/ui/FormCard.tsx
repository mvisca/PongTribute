import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  title: string;
}

export default function FormCard({ children, title }: Props) {
  return (
    <div className='bg-purple-800 p-8 rounded-xl w-[420px] shadow-lg'>
      <h1 className='text-2xl font-bold text-center mb-6'>{title}</h1>
      {children}
    </div>
  );
}
