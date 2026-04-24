import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AlertError from './AlertError';

interface Props {
  	value: string;
  	onChange: (v: string) => void;
  	placeholder?: string;
	error?: string;
	onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export default function PasswordInput({ value, onChange, placeholder, error = '', onKeyDown }: Props) {
  const { t } = useTranslation('common');
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
          {show ? t('hide') : t('show')}
        </button>
      </div>
      <AlertError message={error ?? ''} />
    </div>
  );
}
