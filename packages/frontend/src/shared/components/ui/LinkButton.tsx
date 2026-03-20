import { ReactNode } from 'react';

interface Props {
	onClick: () => void;
	children: ReactNode;
	disabled?: boolean;
}

export default function LinkButton({ onClick, children, disabled }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className='text-sm text-purple-300 hover:underline disabled:opacity-40 disabled:cursor-not-allowed'
    >
      {children}
    </button>
  );
}