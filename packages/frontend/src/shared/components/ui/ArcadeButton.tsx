import { ReactNode } from 'react';

interface Props {
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  loading?: boolean;
}

export default function ArcadeButton({ onClick, children, disabled = false, loading = false }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className='arcade-btn px-8 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed'
    >
      {loading ? 'LOADING...' : children}
    </button>
  );
}
