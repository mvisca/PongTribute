import { ReactNode } from 'react';

interface Props {
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}

export default function NeonButton({ onClick, children, disabled = false }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className='neon-btn px-6 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed'
    >
      {children}
    </button>
  );
}
