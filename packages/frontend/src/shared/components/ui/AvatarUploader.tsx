import { useEffect } from 'react';
import { useAvatarUpload } from '../../hooks/useAvatarUpload';
import AvatarDisplay from './AvatarDisplay';
import AlertError from './AlertError';

interface Props {
  onFileChange: (base64: string | null) => void;
  currentSrc?: string | null;
}

export default function AvatarUploader({ onFileChange, currentSrc }: Props) {
  const { preview, base64, error, handleFile } = useAvatarUpload();

  useEffect(() => {
    onFileChange(base64);
  }, [base64]);

  return (
    <div className='mb-4 flex flex-col items-center gap-3'>
      <AvatarDisplay src={preview ?? currentSrc ?? null} size='lg' />
      <label className='cursor-pointer text-xs text-purple-300 hover:text-white transition-colors'>
        <span className='arcade-btn px-4 py-1 text-xs'>SELECT IMAGE</span>
        <input
          type='file'
          className='hidden'
          accept='image/png,image/jpeg,image/jpg,image/webp'
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>
      <AlertError message={error} />
    </div>
  );
}
