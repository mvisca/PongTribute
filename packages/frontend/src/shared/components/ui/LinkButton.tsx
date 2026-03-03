import { ReactNode } from 'react';

interface Props {
  onClick: () => void;
  children: ReactNode;
}

export default function LinkButton({ onClick, children }: Props) {
  return (
    <button onClick={onClick} className='text-sm text-purple-300 hover:underline'>
      {children}
    </button>
  );
}
