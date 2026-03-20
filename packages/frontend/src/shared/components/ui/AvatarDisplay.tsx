// src/shared/components/ui/AvatarDisplay.tsx
import { useState, useEffect } from 'react';

interface Props {
  src: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'w-12 h-12',
  md: 'w-20 h-20',
  lg: 'w-32 h-32',
};

export default function AvatarDisplay({ src, size = 'md' }: Props) {
	const sizeClass = sizeMap[size];
	const [imgError, setImgError] = useState(false);

// Si cambia el src, reintentar
  useEffect(() => {
    setImgError(false);
  }, [src]);

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt='Avatar'
        className={`${sizeClass} rounded-full object-cover border-2 border-purple-500`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className={`${sizeClass} rounded-full bg-purple-700 flex items-center justify-center text-2xl border-2 border-purple-500`}>
      👤
    </div>
  );
}