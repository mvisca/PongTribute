import { useEffect, useRef } from 'react';
import { useAvatarUpload } from '../../hooks/useAvatarUpload';
import AvatarDisplay from './AvatarDisplay';

interface Props {
	onFileChange: (base64: string | null) => void;
	onError?: (msg: string) => void;
	currentSrc?: string | null;
}

export default function AvatarUploader({ onFileChange, onError, currentSrc }: Props) {
	const { base64, error, handleFile, clear } = useAvatarUpload();

	const displaySrc = base64 || (base64 === '' ? null : currentSrc ?? null)
	// Show reset if: reset has not been pressed (base64 !== '')
	// and there is a new image (base64 = something) or there is not a cuustom avatar (currentSrc !== DEFAULT)
	const showReset = base64 !== '' && !!(base64 || currentSrc)

	// Avoid call onFileChange on mount (prevents seting base64 on null without reset)
	const isFirstRender = useRef(true);

	// To track avatar changes
	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}

		// Only notify parent on actual changes
		onFileChange(base64 === '' ? null : base64);
	}, [base64]);

	// To track erros
	useEffect(() => {
		if (error) onError?.(error);
	}, [error]);

	return (
		<div className='mb-4 flex flex-col items-center gap-3'>
			<AvatarDisplay src={displaySrc} size='lg' />
			
			{showReset &&
				<button
					onClick={() => { clear(); }}
					className='text-xs text-purple-400 hover:text-purple-200'
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