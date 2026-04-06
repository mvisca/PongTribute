import { useState } from 'react';
import AlertError from './AlertError';

interface Props {
  	value: string;
  	onChange: (v: string) => void;
  	placeholder?: string;
	error?: string;
	onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export default function PasswordInput({ value, onChange, placeholder = 'Password', error = '', onKeyDown  }: Props) {
  const [show, setShow] = useState(false);

  return (
    <div className='mb-4'>
      <div className='relative'>
        <input
			type={show ? 'text' : 'password'}
			className='input pr-12'
			placeholder={placeholder}
			value={value}
			onChange={(e) => onChange(e.target.value)}
			onKeyDown={onKeyDown}
        />
        <button
          type='button'
          onClick={() => setShow(s => !s)}
          className='absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-200 text-xs'
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      <AlertError message={error ?? ''} />
    </div>
  );
}
