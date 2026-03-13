import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export default function PageContainer({ children }: Props) {
  return (
    <div className='retro-bg flex items-center justify-center h-full'>
      {children}
    </div>
  );
}
