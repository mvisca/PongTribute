import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export default function PageContainer({ children }: Props) {
  return (
    <div className='retro-bg flex flex-col items-center justify-start sm:justify-center min-h-full px-4 py-8'>
      {children}
    </div>
  );
}
