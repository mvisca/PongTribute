import { useEffect } from 'react';
import { useAvatarUpload } from '../../hooks/useAvatarUpload';
import AvatarDisplay from './AvatarDisplay';

interface Props {
	currentSrc?: string | null;
	onFileChange: (base64: string | null) => void;
	onError?: (msg: string) => void;
}

export default function AvatarUploader({ onFileChange, onError, currentSrc }: Props) {
	const DEFAULT = import.meta.env.VITE_DEFAULT_AVATAR;
	const isDefault = currentSrc === DEFAULT;
	const { base64, error, handleFile, clear } = useAvatarUpload();
	const displaySrc = base64 || (base64 === '' ? DEFAULT : currentSrc ?? DEFAULT)
	const showReset = !!(base64 || (currentSrc && currentSrc !== DEFAULT))

	useEffect(() => {
		onFileChange(base64 === '' ? null : base64);
	}, [base64]);

	useEffect(() => {
		if (error) onError?.(error);
	}, [error]);
	
	return (
		<div className='mb-4 flex flex-col items-center gap-3'>
			<AvatarDisplay src={displaySrc} size='lg' />
			
			{showReset &&
				<button
					onClick={() => { clear(); }}
				>
					Reset
				</button>
			}

			<label className='cursor-pointer px-4 py-2 text-xs text-purple-300 hover:text-white transition-colors'>
			<span className='arcade-btn px-4 py-2 text-xs'>SELECT IMAGE</span>
			<input
				type='file'
				className='hidden'
				accept='image/png,image/jpeg,image/jpg,image/webp'
				onChange={(e) => handleFile(e.target.files?.[0])}
			/>
			</label>
		</div>
	);
}