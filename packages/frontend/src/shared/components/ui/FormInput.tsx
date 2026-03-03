import AlertError from './AlertError';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
  onBlur?: () => void;
}

export default function FormInput({ value, onChange, placeholder = '', error = '', type = 'text', onBlur }: Props) {
  return (
    <div className='mb-4'>
      <input
        type={type}
        className='input'
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      <AlertError message={error ?? ''} />
    </div>
  );
}
